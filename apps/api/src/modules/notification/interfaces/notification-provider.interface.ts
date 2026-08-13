export interface NotificationSendResult {
  success: boolean;
  providerRef?: string;
  rawResponse?: unknown;
  errorMessage?: string;
}

export interface NotificationProvider {
  channel: 'sms' | 'email' | 'whatsapp';
  /** Actually dispatches the message via the external provider. */
  send(
    recipient: string,
    content: NotificationContent,
  ): Promise<NotificationSendResult>;
  /** Builds a payload the human can review/send manually (e.g. wa.me link) without dispatching. */
  prepare(
    recipient: string,
    content: NotificationContent,
  ): NotificationPreparedPayload;
}

export interface NotificationContent {
  subject?: string; // email only
  body: string;
  templateKey?: string;
  variables?: Record<string, string | number>;
}

export interface NotificationPreparedPayload {
  channel: 'sms' | 'email' | 'whatsapp';
  recipient: string;
  renderedBody: string;
  deepLink?: string; // e.g. https://wa.me/<number>?text=<encoded>
}
