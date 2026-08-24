import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { SuperAdminAuditService } from './super-admin-audit.service';

@Module({
  imports: [PrismaModule],
  providers: [SuperAdminAuditService],
  exports: [SuperAdminAuditService],
})
export class SuperAdminAuditModule {}
