import { IsString } from 'class-validator';

export class SuperAdminRefreshDto {
  @IsString()
  refreshToken: string;
}
