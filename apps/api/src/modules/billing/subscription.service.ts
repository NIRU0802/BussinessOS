import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../common/tenant-context/tenant-context.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MinioService } from '../../common/storage/minio.service';
import { AssignPlanDto } from './dto/assign-plan.dto';
import { ActivateSubscriptionDto } from './dto/activate-subscription.dto';
import { calculateProration } from './proration.util';
import { BILLING_EVENTS } from './events/billing.events';
import { BILLING_PROVIDER } from './providers/billing-provider.interface';
import type { IBillingProvider } from './providers/billing-provider.interface';

@Injectable()
export class SubscriptionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
    private readonly eventEmitter: EventEmitter2,
    @Inject(BILLING_PROVIDER)
    private readonly billingProvider: IBillingProvider,
    private readonly minio: MinioService,
  ) {}

  async getCurrentSubscription(tenantId: string) {
    return this.prisma.forTenant(tenantId, (tx) =>
      tx.subscription.findFirst({
        where: { status: { in: ['trialing', 'active', 'past_due'] } },
        include: { plan: { include: { limits: true, widgets: true } } },
        orderBy: { startedAt: 'desc' },
      }),
    );
  }

  /**
   * Returns invoice history for the tenant, newest first. Resolves
   * pdfObjectKey to a signed, time-limited download URL at read time -
   * never stores or returns a public URL, per storage architecture rules.
   */
  async getInvoices(tenantId: string) {
    const invoices = await this.prisma.forTenant(tenantId, (tx) =>
      tx.invoice.findMany({
        where: { tenantId },
        include: { items: true },
        orderBy: { issuedAt: 'desc' },
      }),
    );

    return Promise.all(
      invoices.map(async (invoice) => ({
        ...invoice,
        pdfUrl: invoice.pdfObjectKey
          ? await this.minio.getSignedReadUrl(invoice.pdfObjectKey)
          : null,
      })),
    );
  }

  /**
   * Returns the tenant's default (isDefault: true) payment method, with
   * the providerToken masked - never expose the raw token to the client.
   */
  async getDefaultPaymentMethod(tenantId: string) {
    const method = await this.prisma.forTenant(tenantId, (tx) =>
      tx.billingPaymentMethod.findFirst({
        where: { tenantId, isDefault: true },
      }),
    );

    if (!method) return null;

    return {
      id: method.id,
      provider: method.provider,
      isDefault: method.isDefault,
      createdAt: method.createdAt,
      maskedToken: this.maskToken(method.providerToken),
    };
  }

  private maskToken(token: string): string {
    if (token.length <= 4) return '****';
    return `**** **** **** ${token.slice(-4)}`;
  }

  /**
   * Assigns a brand-new TRIAL subscription to a tenant that has none
   * yet (e.g. at tenant registration). No billing provider is involved
   * at this stage - trials don't require a payment method.
   */
  async createInitialSubscription(
    tenantId: string,
    planId: string,
    trialDays = 14,
  ) {
    const plan = await this.prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) throw new NotFoundException(`Plan ${planId} not found`);

    const renewalDate = new Date();
    renewalDate.setDate(renewalDate.getDate() + trialDays);

    const subscription = await this.prisma.forTenant(tenantId, (tx) =>
      tx.subscription.create({
        data: {
          tenantId,
          planId,
          status: 'trialing',
          renewalDate,
          startedAt: new Date(),
        },
      }),
    );

    this.eventEmitter.emit(BILLING_EVENTS.SUBSCRIPTION_CREATED, {
      tenantId,
      subscriptionId: subscription.id,
    });

    return subscription;
  }

  /**
   * Converts a trial (or reactivates a cancelled/past_due) subscription
   * into a live, provider-backed paid subscription. Creates a billing
   * customer + subscription with the active provider (Razorpay/Stripe)
   * and stores the returned IDs - this is what populates the
   * provider/providerCustomerId/providerSubscriptionId columns that
   * the webhook handler later matches incoming events against.
   */
  async activateSubscription(tenantId: string, dto: ActivateSubscriptionDto) {
    const current = await this.getCurrentSubscription(tenantId);
    if (!current) {
      throw new NotFoundException(
        `Tenant ${tenantId} has no subscription to activate. Call createInitialSubscription first.`,
      );
    }
    if (current.status === 'active' && current.providerSubscriptionId) {
      throw new ConflictException(
        'Subscription is already active with a billing provider.',
      );
    }
    if (dto.provider !== this.billingProvider.providerName) {
      throw new BadRequestException(
        `Requested provider "${dto.provider}" does not match the currently active platform provider "${this.billingProvider.providerName}". ` +
          `Provider switching mid-subscription is not supported in this phase.`,
      );
    }
    if (!current.plan.providerPlanId) {
      throw new BadRequestException(
        `Plan "${current.plan.name}" has no providerPlanId configured. Set it via the plan management endpoint before activating a paid subscription.`,
      );
    }

    const customer = await this.billingProvider.createCustomer({
      tenantId,
      email: dto.billingEmail,
      name: dto.billingName,
    });

    const providerSubscription = await this.billingProvider.createSubscription({
      providerCustomerId: customer.providerCustomerId,
      providerPlanId: current.plan.providerPlanId,
      tenantId,
    });

    const updated = await this.prisma.forTenant(tenantId, (tx) =>
      tx.subscription.update({
        where: { id: current.id },
        data: {
          status: 'active',
          provider: dto.provider,
          providerCustomerId: customer.providerCustomerId,
          providerSubscriptionId: providerSubscription.providerSubscriptionId,
        },
      }),
    );

    await this.prisma.forTenant(tenantId, (tx) =>
      tx.billingPaymentMethod.updateMany({
        where: { tenantId },
        data: { isDefault: false },
      }),
    );
    await this.prisma.forTenant(tenantId, (tx) =>
      tx.billingPaymentMethod.create({
        data: {
          tenantId,
          provider: dto.provider,
          providerToken: dto.providerToken,
          isDefault: true,
        },
      }),
    );

    this.eventEmitter.emit(BILLING_EVENTS.SUBSCRIPTION_CREATED, {
      tenantId,
      subscriptionId: updated.id,
      activated: true,
    });

    return updated;
  }

  /**
   * Changes a tenant's plan mid-cycle. Calculates proration and creates
   * a one-off invoice item for the difference - does NOT re-create the
   * provider subscription; that's a Phase-3 refinement.
   */
  async changePlan(tenantId: string, dto: AssignPlanDto) {
    const current = await this.getCurrentSubscription(tenantId);
    if (!current) {
      throw new BadRequestException(
        `Tenant ${tenantId} has no active subscription to change. Use createInitialSubscription instead.`,
      );
    }

    const newPlan = await this.prisma.plan.findUnique({
      where: { id: dto.planId },
    });
    if (!newPlan) throw new NotFoundException(`Plan ${dto.planId} not found`);
    if (newPlan.id === current.planId) {
      throw new BadRequestException('Tenant is already on this plan.');
    }

    const proration = calculateProration({
      oldPlanPrice: Number(current.plan.price),
      newPlanPrice: Number(newPlan.price),
      billingCycle: newPlan.billingCycle,
      cycleStartDate: current.startedAt,
      changeDate: new Date(),
    });

    const updated = await this.prisma.forTenant(tenantId, async (tx) => {
      const subscription = await tx.subscription.update({
        where: { id: current.id },
        data: { planId: newPlan.id },
      });

      if (proration.proratedAmount !== 0) {
        await tx.invoice.create({
          data: {
            tenantId,
            subscriptionId: subscription.id,
            amount: proration.proratedAmount,
            status: 'issued',
            issuedAt: new Date(),
            items: {
              create: [
                {
                  description: `Proration: ${current.plan.name} -> ${newPlan.name} (${proration.daysRemainingInCycle} days)`,
                  amount: proration.proratedAmount,
                },
              ],
            },
          },
        });
      }

      return subscription;
    });

    this.eventEmitter.emit(BILLING_EVENTS.SUBSCRIPTION_PLAN_CHANGED, {
      tenantId,
      subscriptionId: updated.id,
      previousPlanId: current.planId,
      newPlanId: newPlan.id,
      proratedAmount: proration.proratedAmount,
    });

    return updated;
  }

  async cancelSubscription(tenantId: string) {
    const current = await this.getCurrentSubscription(tenantId);
    if (!current) throw new NotFoundException('No active subscription found.');

    if (current.providerSubscriptionId) {
      await this.billingProvider.cancelSubscription({
        providerSubscriptionId: current.providerSubscriptionId,
      });
    }

    const updated = await this.prisma.forTenant(tenantId, (tx) =>
      tx.subscription.update({
        where: { id: current.id },
        data: { status: 'cancelled', cancelledAt: new Date() },
      }),
    );

    this.eventEmitter.emit(BILLING_EVENTS.SUBSCRIPTION_CANCELLED, {
      tenantId,
      subscriptionId: updated.id,
    });

    return updated;
  }

  async markPastDue(
    tenantId: string,
    subscriptionId: string,
    failureReason?: string,
  ) {
    const updated = await this.prisma.forTenant(tenantId, (tx) =>
      tx.subscription.update({
        where: { id: subscriptionId },
        data: { status: 'past_due' },
      }),
    );

    this.eventEmitter.emit(BILLING_EVENTS.SUBSCRIPTION_PAST_DUE, {
      tenantId,
      subscriptionId,
      failureReason,
    });

    return updated;
  }
}
