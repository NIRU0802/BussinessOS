import { IsOptional, IsString } from 'class-validator';

export class CreateQrSessionDto {
  /**
   * Optional client identifier.
   *
   * The server never trusts this as an identity.
   * It can only be used for client-side session correlation.
   */
  @IsOptional()
  @IsString()
  clientSessionId?: string;
}
