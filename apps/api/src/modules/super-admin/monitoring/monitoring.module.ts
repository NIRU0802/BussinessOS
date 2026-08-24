import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { StorageModule } from '../../../common/storage/storage.module';
import { SuperAdminAuditModule } from '../common/super-admin-audit.module';
import { MonitoringService } from './monitoring.service';
import { MonitoringController } from './monitoring.controller';

@Module({
  imports: [PrismaModule, StorageModule, SuperAdminAuditModule],
  controllers: [MonitoringController],
  providers: [MonitoringService],
  exports: [MonitoringService],
})
export class MonitoringModule {}
