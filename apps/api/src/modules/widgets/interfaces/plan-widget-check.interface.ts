/**
 * Integration point for Phase 2b (Subscription Plans / plan_widgets table).
 *
 * Before a widget is activated for a tenant, the Widget Registry asks an
 * implementation of this interface whether the tenant's current subscription
 * plan permits the widget. This module is deliberately NOT coupled to billing
 * logic directly — Phase 2b will provide a real implementation that queries
 * plan_widgets, joined on the stable widget_key.
 *
 * Until Phase 2b exists, the StubPlanWidgetCheckService below always returns
 * true, so nothing here needs to change when Phase 2b is wired in — only the
 * provider binding in widgets.module.ts changes.
 */
export interface IPlanWidgetCheckService {
  /**
   * Returns true if the tenant's current subscription plan permits
   * activating the given widget.
   */
  isWidgetPermittedByPlan(
    tenantId: string,
    widgetKey: string,
  ): Promise<boolean>;
}

export const PLAN_WIDGET_CHECK_SERVICE = Symbol('PLAN_WIDGET_CHECK_SERVICE');
