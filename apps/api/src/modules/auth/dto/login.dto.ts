import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password: string;

  // Required because email is unique per-tenant, not globally.
  // The login form must resolve/select a tenant first (e.g. via tenant
  // slug subdomain or a tenant picker) and pass its id here.
  @IsString()
  tenantSlug: string;
}
