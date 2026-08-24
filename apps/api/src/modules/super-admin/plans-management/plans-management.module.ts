import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { SuperAdminAuditModule } from '../common/super-admin-audit.module';
import { PlansManagementService } from './plans-management.service';
import { PlansManagementController } from './plans-management.controller';

@Module({
  imports: [PrismaModule, SuperAdminAuditModule],
  controllers: [PlansManagementController],
  providers: [PlansManagementService],
  exports: [PlansManagementService],
})
export class PlansManagementModule {}
