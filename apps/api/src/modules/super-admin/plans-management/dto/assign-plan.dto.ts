import { IsString, IsUUID } from 'class-validator';

export class AssignPlanDto {
  @IsUUID()
  tenantId: string;

  @IsString()
  planId: string;
}
