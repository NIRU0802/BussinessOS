import { Module } from '@nestjs/common';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrdersGateway } from './orders.gateway';
import { SyncEngineService } from './sync-engine.service';
import { SyncEngineController } from './sync-engine.controller';
import { QuickCashierService } from './quick-cashier.service';
import { QuickCashierController } from './quick-cashier.controller';
import { ReceiptService } from './receipt.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { NotificationModule } from '../notification/notification.module';
import { TaxModule } from '../tax/tax.module';

@Module({
  imports: [
    PrismaModule,
    AuditLogModule,
    NotificationModule,
    TaxModule,
    // Mirrors AuthModule's JwtModule.registerAsync exactly (same secret,
    // same TTL env var and default) so quick-login tokens are
    // indistinguishable from full-login tokens to JwtStrategy/PermissionsGuard.
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        ({
          secret: config.get<string>('JWT_ACCESS_SECRET'),
          signOptions: {
            expiresIn: config.get<string>('JWT_ACCESS_TTL') ?? '900s',
          },
        }) as JwtModuleOptions,
    }),
  ],
  controllers: [OrdersController, SyncEngineController, QuickCashierController],
  providers: [
    OrdersService,
    OrdersGateway,
    SyncEngineService,
    QuickCashierService,
    ReceiptService,
  ],
  exports: [OrdersService, OrdersGateway],
})
export class OrdersModule {}
