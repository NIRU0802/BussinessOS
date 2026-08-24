import { IsDateString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class PnlQueryDto {
  @IsDateString()
  @IsNotEmpty()
  fromDate: string;

  @IsDateString()
  @IsNotEmpty()
  toDate: string;

  // If omitted and the caller has reports.read_all_branches, results are
  // rolled up tenant-wide. If provided, scoped to that single branch.
  @IsOptional()
  @IsUUID()
  branchId?: string;
}
