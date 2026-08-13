export const WIDGET_ACTIVATED_EVENT = 'widget.activated';
export const WIDGET_DEACTIVATED_EVENT = 'widget.deactivated';

export class WidgetActivatedEvent {
  constructor(
    public readonly tenantId: string,
    public readonly widgetKey: string,
    public readonly activatedAt: Date,
  ) {}
}

export class WidgetDeactivatedEvent {
  constructor(
    public readonly tenantId: string,
    public readonly widgetKey: string,
    public readonly deactivatedAt: Date,
  ) {}
}
