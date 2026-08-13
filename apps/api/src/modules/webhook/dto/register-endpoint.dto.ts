import { IsIn, IsOptional, IsString, IsUrl } from 'class-validator';

export class RegisterEndpointDto {
  @IsString()
  name: string;

  @IsIn(['inbound', 'outbound'])
  direction: 'inbound' | 'outbound';

  @IsOptional()
  @IsUrl({ require_tld: false })
  url?: string;
}
