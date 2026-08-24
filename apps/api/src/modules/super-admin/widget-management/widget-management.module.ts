import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { SuperAdminAuditModule } from '../common/super-admin-audit.module';
import { WidgetManagementService } from './widget-management.service';
import { WidgetManagementController } from './widget-management.controller';

@Module({
  imports: [PrismaModule, SuperAdminAuditModule],
  controllers: [WidgetManagementController],
  providers: [WidgetManagementService],
  exports: [WidgetManagementService],
})
export class WidgetManagementModule {}
