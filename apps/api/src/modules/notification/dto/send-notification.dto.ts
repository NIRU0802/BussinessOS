import {
  IsBoolean,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export class SendNotificationDto {
  @IsIn(['sms', 'email', 'whatsapp'])
  channel: 'sms' | 'email' | 'whatsapp';

  @IsIn(['generic', 'security_alert', 'marketing', 'transactional'])
  triggerType: 'generic' | 'security_alert' | 'marketing' | 'transactional';

  @IsIn(['auto_send', 'prepare_only'])
  mode: 'auto_send' | 'prepare_only';

  /**
   * Flag-based, not hardcoded per messageType — any future module marks
   * its own messages as consent-gated by setting this true.
   * Ignored (forced false) when triggerType === 'security_alert'.
   */
  @IsBoolean()
  consentGated: boolean;

  @IsString()
  recipient: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  templateKey?: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsString()
  body: string;

  @IsOptional()
  @IsObject()
  variables?: Record<string, string | number>;

  /**
   * Required only when consentGated=true — the caller must pass the
   * recipient's current marketing_consent flag (fetched from CRM module
   * via its service/event interface, never via direct repository access).
   */
  @IsOptional()
  @IsBoolean()
  recipientHasMarketingConsent?: boolean;
}
