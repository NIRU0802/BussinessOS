import { IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';

export class CreateFlagDto {
  @IsString()
  key: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isEnabledGlobally?: boolean;
}
