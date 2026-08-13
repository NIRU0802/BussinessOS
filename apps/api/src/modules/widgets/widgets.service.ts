import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { PLAN_WIDGET_CHECK_SERVICE } from './interfaces/plan-widget-check.interface';
import type { IPlanWidgetCheckService } from './interfaces/plan-widget-check.interface';
import {
  WIDGET_ACTIVATED_EVENT,
  WIDGET_DEACTIVATED_EVENT,
  WidgetActivatedEvent,
  WidgetDeactivatedEvent,
} from './events/widget.events';

@Injectable()
export class WidgetsService {
  private readonly logger = new Logger(WidgetsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    @Inject(PLAN_WIDGET_CHECK_SERVICE)
    private readonly planWidgetCheckService: IPlanWidgetCheckService,
  ) {}

  async listWidgetsForTenant(tenantId: string) {
    const [allWidgets, tenantWidgets] = await Promise.all([
      this.prisma.featureWidget.findMany({
        orderBy: { name: 'asc' },
      }),
      this.prisma.tenantWidget.findMany({
        where: { tenantId },
      }),
    ]);

    const tenantWidgetMap = new Map(
      tenantWidgets.map((tw) => [tw.widgetKey, tw]),
    );

    return allWidgets.map((widget) => {
      const tenantWidget = tenantWidgetMap.get(widget.widgetKey);
      return {
        widgetKey: widget.widgetKey,
        name: widget.name,
        description: widget.description,
        catalogStatus: widget.status,
        tenantStatus: tenantWidget?.status ?? 'disabled',
        activatedAt: tenantWidget?.activatedAt ?? null,
        billingCycle: tenantWidget?.billingCycle ?? null,
      };
    });
  }

  async isWidgetActive(tenantId: string, widgetKey: string): Promise<boolean> {
    const tenantWidget = await this.prisma.tenantWidget.findUnique({
      where: { tenantId_widgetKey: { tenantId, widgetKey } },
    });

    if (!tenantWidget) return false;
    return tenantWidget.status === 'active' || tenantWidget.status === 'trial';
  }

  async enableWidget(
    tenantId: string,
    widgetKey: string,
    billingCycle?: string,
  ) {
    const widget = await this.prisma.featureWidget.findUnique({
      where: { widgetKey },
    });

    if (!widget) {
      throw new NotFoundException(
        `Widget "${widgetKey}" does not exist in the catalog.`,
      );
    }

    if (widget.status === 'deprecated') {
      throw new BadRequestException(
        `Widget "${widgetKey}" is deprecated and cannot be enabled.`,
      );
    }

    const permitted = await this.planWidgetCheckService.isWidgetPermittedByPlan(
      tenantId,
      widgetKey,
    );

    if (!permitted) {
      throw new ForbiddenException(
        `Your current subscription plan does not include the "${widgetKey}" widget.`,
      );
    }

    const now = new Date();

    const tenantWidget = await this.prisma.tenantWidget.upsert({
      where: { tenantId_widgetKey: { tenantId, widgetKey } },
      create: {
        tenantId,
        widgetKey,
        status: 'active',
        activatedAt: now,
        billingCycle: billingCycle ?? null,
      },
      update: {
        status: 'active',
        activatedAt: now,
        billingCycle: billingCycle ?? undefined,
      },
    });

    this.logger.log(`Widget "${widgetKey}" enabled for tenant ${tenantId}`);

    this.eventEmitter.emit(
      WIDGET_ACTIVATED_EVENT,
      new WidgetActivatedEvent(tenantId, widgetKey, now),
    );

    return tenantWidget;
  }

  async disableWidget(tenantId: string, widgetKey: string) {
    const widget = await this.prisma.featureWidget.findUnique({
      where: { widgetKey },
    });

    if (!widget) {
      throw new NotFoundException(
        `Widget "${widgetKey}" does not exist in the catalog.`,
      );
    }

    const now = new Date();

    const tenantWidget = await this.prisma.tenantWidget.upsert({
      where: { tenantId_widgetKey: { tenantId, widgetKey } },
      create: {
        tenantId,
        widgetKey,
        status: 'disabled',
        activatedAt: null,
      },
      update: {
        status: 'disabled',
      },
    });

    this.logger.log(`Widget "${widgetKey}" disabled for tenant ${tenantId}`);

    this.eventEmitter.emit(
      WIDGET_DEACTIVATED_EVENT,
      new WidgetDeactivatedEvent(tenantId, widgetKey, now),
    );

    return tenantWidget;
  }
}
