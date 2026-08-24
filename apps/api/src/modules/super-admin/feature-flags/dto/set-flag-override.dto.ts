import { IsUUID, IsBoolean } from 'class-validator';

export class SetFlagOverrideDto {
  @IsUUID()
  tenantId: string;

  @IsBoolean()
  isEnabled: boolean;
}
