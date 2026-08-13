import { Module } from '@nestjs/common';
import { WidgetsService } from './widgets.service';
import { WidgetsController } from './widgets.controller';
import { PresetsService } from './presets/presets.service';
import { WidgetGuard } from './guards/widget.guard';
import { PLAN_WIDGET_CHECK_SERVICE } from './interfaces/plan-widget-check.interface';
import { StubPlanWidgetCheckService } from './interfaces/stub-plan-widget-check.service';

/**
 * When Phase 2b (Subscription Plans) is built, replace the provider below
 * with a real implementation of IPlanWidgetCheckService that queries
 * plan_widgets — no other file in this module needs to change.
 *
 *   { provide: PLAN_WIDGET_CHECK_SERVICE, useClass: RealPlanWidgetCheckService }
 */
@Module({
  controllers: [WidgetsController],
  providers: [
    WidgetsService,
    PresetsService,
    WidgetGuard,
    {
      provide: PLAN_WIDGET_CHECK_SERVICE,
      useClass: StubPlanWidgetCheckService,
    },
  ],
  exports: [WidgetsService, WidgetGuard],
})
export class WidgetsModule {}
