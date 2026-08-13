import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateBranchDto {
  @IsString()
  @MaxLength(150)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{2}$/, {
    message: 'country must be a valid ISO 3166-1 alpha-2 country code',
  })
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  timezone?: string;
}
