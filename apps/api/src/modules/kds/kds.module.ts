import { Module } from '@nestjs/common';
import { KdsService } from './kds.service';
import { KdsSettingsService } from './kds-settings.service';
import { KdsGateway } from './kds.gateway';
import { KdsController } from './kds.controller';
import { NetworkEscPosPrinterAdapter } from './printers/network-escpos-printer.adapter';
import { TICKET_PRINTER_ADAPTER } from './interfaces/printer-adapter.interface';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [PrismaModule, AuditLogModule],
  controllers: [KdsController],
  providers: [
    KdsService,
    KdsSettingsService,
    KdsGateway,
    NetworkEscPosPrinterAdapter,
    {
      provide: TICKET_PRINTER_ADAPTER,
      useExisting: NetworkEscPosPrinterAdapter,
    },
  ],
  exports: [KdsService],
})
export class KdsModule {}
