import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { SuperAdminAuditModule } from '../common/super-admin-audit.module';
import { TenantManagementService } from './tenant-management.service';
import { TenantManagementController } from './tenant-management.controller';

@Module({
  imports: [PrismaModule, SuperAdminAuditModule],
  controllers: [TenantManagementController],
  providers: [TenantManagementService],
  exports: [TenantManagementService],
})
export class TenantManagementModule {}
