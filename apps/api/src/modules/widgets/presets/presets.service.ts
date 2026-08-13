import { Injectable, Logger } from '@nestjs/common';
import { WidgetsService } from '../widgets.service';
import {
  BUSINESS_TYPE_PRESETS,
  BusinessTypePresetKey,
} from './business-type-presets';

@Injectable()
export class PresetsService {
  private readonly logger = new Logger(PresetsService.name);

  constructor(private readonly widgetsService: WidgetsService) {}

  /**
   * Applies a business type preset by bulk-enabling its widget set through
   * the Widget Registry service. Presets never bypass the registry — every
   * widget goes through the same activation path (plan checks, events,
   * persistence) as a manual single-widget enable.
   *
   * If one widget in the preset fails plan checks, the rest still apply;
   * failures are collected and returned so the caller/frontend can surface
   * a partial-success message rather than silently failing the whole preset.
   */
  async applyPreset(tenantId: string, presetKey: BusinessTypePresetKey) {
    const widgetKeys = BUSINESS_TYPE_PRESETS[presetKey];

    const results = await Promise.allSettled(
      widgetKeys.map((widgetKey) =>
        this.widgetsService.enableWidget(tenantId, widgetKey),
      ),
    );

    const enabled: string[] = [];
    const failed: { widgetKey: string; reason: string }[] = [];

    results.forEach((result, index) => {
      const widgetKey = widgetKeys[index];
      if (result.status === 'fulfilled') {
        enabled.push(widgetKey);
      } else {
        this.logger.warn(
          `Preset "${presetKey}" failed to enable widget "${widgetKey}" for tenant ${tenantId}: ${result.reason}`,
        );
        failed.push({
          widgetKey,
          reason: String(result.reason?.message ?? result.reason),
        });
      }
    });

    return { presetKey, enabled, failed };
  }
}
