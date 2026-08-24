import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { SuperAdminAuditModule } from '../common/super-admin-audit.module';
import { FeatureFlagsService } from './feature-flags.service';
import { FeatureFlagsController } from './feature-flags.controller';

@Module({
  imports: [PrismaModule, SuperAdminAuditModule],
  controllers: [FeatureFlagsController],
  providers: [FeatureFlagsService],
  exports: [FeatureFlagsService],
})
export class FeatureFlagsModule {}
