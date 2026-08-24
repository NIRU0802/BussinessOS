import { IsIn, IsOptional, IsBoolean } from 'class-validator';

export class UpdateWidgetStatusDto {
  @IsOptional()
  @IsIn(['active', 'beta', 'deprecated'])
  status?: 'active' | 'beta' | 'deprecated';

  @IsOptional()
  @IsBoolean()
  isEnabledGlobally?: boolean;
}
