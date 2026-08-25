import { Module } from '@nestjs/common';
import { CustomerDataController } from './customer-data.controller';
import { CustomerDataService } from './customer-data.service';
import { PrismaModule } from '../../../prisma/prisma.module';
import { SuperAdminAuditModule } from '../common/super-admin-audit.module';

@Module({
  imports: [PrismaModule, SuperAdminAuditModule],
  controllers: [CustomerDataController],
  providers: [CustomerDataService],
})
export class CustomerDataModule {}
