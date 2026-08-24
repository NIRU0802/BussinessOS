import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { RbacModule } from './modules/rbac/rbac.module';
import { BranchModule } from './modules/branch/branch.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { TenantContextMiddleware } from './common/tenant-context/tenant-context.middleware';
import { MenuModule } from './modules/menu/menu.module';
import { StorageModule } from './common/storage/storage.module';
import { StaffModule } from './modules/staff/staff.module';
import { BullModule } from '@nestjs/bullmq';
import { TaxModule } from './modules/tax/tax.module';
import { CurrencyModule } from './modules/currency/currency.module';
import { LanguageModule } from './modules/language/language.module';
import { TimezoneModule } from './modules/timezone/timezone.module';
import { NotificationModule } from './modules/notification/notification.module';
import { PaymentModule } from './modules/payment/payment.module';
import { WebhookModule } from './modules/webhook/webhook.module';
import { WidgetsModule } from './modules/widgets/widgets.module';
import { OrdersModule } from './modules/orders/orders.module';
import { QrOrderingModule } from './modules/qr-ordering/qr-ordering.module';
import { TablesModule } from './modules/tables/tables.module';
import { ReservationsModule } from './modules/reservations/reservations.module';
import { CustomersModule } from './modules/customers/customers.module';
import { OffersModule } from './modules/offers/offers.module';
import { KdsModule } from './modules/kds/kds.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { ReportsModule } from './modules/reports/reports.module';
import { BillingModule } from './modules/billing/billing.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { SuperAdminModule } from './modules/super-admin/super-admin.module';
import { PlansManagementModule } from './modules/super-admin/plans-management/plans-management.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    JwtModule.register({ global: false }),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: Number(process.env.REDIS_PORT ?? 6379),
      },
    }),
    PrismaModule,
    AuditLogModule,
    AuthModule,
    RbacModule,
    BranchModule,
    StorageModule,
    MenuModule,
    StaffModule,
    TaxModule,
    CurrencyModule,
    LanguageModule,
    TimezoneModule,
    NotificationModule,
    PaymentModule,
    WebhookModule,
    WidgetsModule,
    OrdersModule,
    TablesModule,
    ReservationsModule,
    QrOrderingModule,
    CustomersModule,
    OffersModule,
    KdsModule,
    InventoryModule,
    ReportsModule,
    BillingModule,
    ExpensesModule,
    SuperAdminModule,
    PlansManagementModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantContextMiddleware).forRoutes('*');
  }
}
