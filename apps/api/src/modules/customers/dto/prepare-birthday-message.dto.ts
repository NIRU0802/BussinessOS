import { IsOptional, IsString, MaxLength } from 'class-validator';

export class PrepareBirthdayMessageDto {
  /**
   * Optional custom message override. If omitted, a default templated
   * birthday message is generated server-side using the customer's name
   * and the tenant's business name.
   */
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  customMessage?: string;
}
