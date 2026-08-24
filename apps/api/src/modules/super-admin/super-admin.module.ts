import { Module } from '@nestjs/common';
import { SuperAdminAuthModule } from './auth/super-admin-auth.module';
import { SuperAdminAuditModule } from './common/super-admin-audit.module';
import { TenantManagementModule } from './tenant-management/tenant-management.module';
import { PlansManagementModule } from './plans-management/plans-management.module';
import { WidgetManagementModule } from './widget-management/widget-management.module';
import { FeatureFlagsModule } from './feature-flags/feature-flags.module';
import { MonitoringModule } from './monitoring/monitoring.module';

@Module({
  imports: [
    SuperAdminAuthModule,
    SuperAdminAuditModule,
    TenantManagementModule,
    PlansManagementModule,
    WidgetManagementModule,
    FeatureFlagsModule,
    MonitoringModule,
  ],
  exports: [SuperAdminAuditModule],
})
export class SuperAdminModule {}
