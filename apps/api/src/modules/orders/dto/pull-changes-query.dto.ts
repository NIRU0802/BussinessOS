import { IsDateString, IsUUID } from 'class-validator';

export class PullChangesQueryDto {
  @IsUUID()
  branchId: string;

  // ISO timestamp of the last successful sync from THIS device.
  // Server returns everything tenant/branch-scoped that changed after this.
  @IsDateString()
  lastSyncedAt: string;
}
