import { Module } from '@nestjs/common';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';
import { PrismaModule } from '../../../prisma/prisma.module';
import { SuperAdminAuditModule } from '../common/super-admin-audit.module';
import { BillingModule } from '../../billing/billing.module';

@Module({
  imports: [PrismaModule, SuperAdminAuditModule, BillingModule],
  controllers: [OnboardingController],
  providers: [OnboardingService],
})
export class OnboardingModule {}
