import { IsUUID } from 'class-validator';

export class AssignBranchDto {
  @IsUUID()
  userId: string;

  @IsUUID()
  branchId: string;
}
