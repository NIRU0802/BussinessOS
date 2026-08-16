import { IsUUID } from 'class-validator';

export class BranchIdQueryDto {
  @IsUUID()
  branchId: string;
}
