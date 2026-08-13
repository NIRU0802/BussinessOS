import { IsOptional, IsString, MaxLength } from 'class-validator';

export class EnableWidgetDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  billingCycle?: string;
}
