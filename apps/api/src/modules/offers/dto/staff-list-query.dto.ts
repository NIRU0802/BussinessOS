import { IsUUID } from 'class-validator';

export class StaffListQueryDto {
  @IsUUID()
  tenantId: string;

  @IsUUID()
  branchId: string;
}
