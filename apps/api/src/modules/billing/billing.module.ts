import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';
// ADJUST: confirm this is the module that provides MinioService.
import { StorageModule } from '../../common/storage/storage.module';

import { PlanService } from './plan.service';
import { PlanController } from './plan.controller';
import { SubscriptionService } from './subscription.service';
import { SubscriptionController } from './subscription.controller';
import { UsageTrackingService } from './usage-tracking.service';
import { InvoiceService } from './invoice.service';
import { BillingWebhookHandlerService } from './billing-webhook-handler.service';
import { BillingWebhookController } from './billing-webhook.controller';

import { RazorpayBillingProvider } from './providers/razorpay-billing.provider';
import { StripeBillingProvider } from './providers/stripe-billing.provider';
import { billingProviderFactory } from './providers/billing-provider.factory';

import { FailedPaymentProcessor } from './jobs/failed-payment.processor';
import { FailedPaymentScheduler } from './jobs/failed-payment.scheduler';
import { InvoiceGenerationProcessor } from './jobs/invoice-generation.processor';

@Module({
  imports: [
    PrismaModule,
    NotificationModule,
    StorageModule,
    BullModule.registerQueue(
      { name: 'billing-failed-payment' },
      { name: 'billing-invoice-generation' },
    ),
  ],
  controllers: [
    PlanController,
    SubscriptionController,
    BillingWebhookController,
  ],
  providers: [
    PlanService,
    SubscriptionService,
    UsageTrackingService,
    InvoiceService,
    BillingWebhookHandlerService,
    RazorpayBillingProvider,
    StripeBillingProvider,
    billingProviderFactory,
    FailedPaymentProcessor,
    FailedPaymentScheduler,
    InvoiceGenerationProcessor,
  ],
  exports: [UsageTrackingService, SubscriptionService, InvoiceService],
})
export class BillingModule {}
