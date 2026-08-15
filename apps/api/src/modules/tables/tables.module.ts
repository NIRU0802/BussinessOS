import { Module } from '@nestjs/common';
import { TablesService } from './tables.service';
import { TablesController } from './tables.controller';
import { QrTokenService } from './qr/qr-token.service';
import { QrSessionService } from './qr/qr-session.service';
import { QrSessionGuard } from './qr/qr-session.guard';
import { TableOrderStatusListener } from './listeners/table-order-status.listener';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [AuditLogModule],
  controllers: [TablesController],
  providers: [
    TablesService,
    QrTokenService,
    QrSessionService,
    QrSessionGuard,
    TableOrderStatusListener,
  ],
  exports: [QrTokenService, QrSessionService, QrSessionGuard],
})
export class TablesModule {}
