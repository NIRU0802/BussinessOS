import { Injectable } from '@nestjs/common';
import { IPlanWidgetCheckService } from './plan-widget-check.interface';

/**
 * Stub implementation used until Phase 2b (Subscription Plans) is built.
 * Always permits activation. Swap the provider binding for
 * PLAN_WIDGET_CHECK_SERVICE in widgets.module.ts to a real Phase 2b
 * implementation once it exists — no other file in this module changes.
 */
@Injectable()
export class StubPlanWidgetCheckService implements IPlanWidgetCheckService {
  async isWidgetPermittedByPlan(
    _tenantId: string,
    _widgetKey: string,
  ): Promise<boolean> {
    return true;
  }
}
