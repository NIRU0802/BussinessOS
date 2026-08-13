import { Module } from '@nestjs/common';
import { RbacService } from './rbac.service';
import { RolesController } from './roles.controller';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [AuditLogModule],
  providers: [RbacService],
  controllers: [RolesController],
  exports: [RbacService],
})
export class RbacModule {}
