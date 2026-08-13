import { IsString } from 'class-validator';

export class SetBranchTimezoneDto {
  @IsString()
  branchId: string;

  @IsString()
  timezone: string; // IANA tz name, validated against Intl in service
}
