import { IsOptional, IsString, Matches } from 'class-validator';

export class UpdateBrandingDto {
  @IsOptional()
  @IsString()
  businessName?: string;

  @IsOptional()
  @IsString()
  logoObjectKey?: string;

  @IsOptional()
  @IsString()
  faviconObjectKey?: string;

  @IsOptional()
  @Matches(/^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/, {
    message: 'primaryColor must be a valid hex color',
  })
  primaryColor?: string;

  @IsOptional()
  @Matches(/^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/, {
    message: 'primaryColorDark must be a valid hex color',
  })
  primaryColorDark?: string;

  @IsOptional()
  @Matches(/^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/, {
    message: 'inkColor must be a valid hex color',
  })
  inkColor?: string;

  @IsOptional()
  @Matches(/^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/, {
    message: 'surfaceColor must be a valid hex color',
  })
  surfaceColor?: string;

  @IsOptional()
  @IsString()
  fontDisplay?: string;

  @IsOptional()
  @IsString()
  receiptFooterText?: string;
}
