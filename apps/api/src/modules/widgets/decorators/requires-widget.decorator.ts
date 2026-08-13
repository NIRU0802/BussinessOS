import { SetMetadata } from '@nestjs/common';

export const REQUIRES_WIDGET_KEY = 'requiresWidget';

/**
 * Route decorator that marks an endpoint as requiring an active widget for
 * the requesting tenant. Must be paired with WidgetGuard.
 *
 * Usage:
 *   @RequiresWidget('inventory')
 *   @UseGuards(JwtAuthGuard, WidgetGuard)
 *   @Get('stock-levels')
 *   getStockLevels() { ... }
 */
export const RequiresWidget = (widgetKey: string) =>
  SetMetadata(REQUIRES_WIDGET_KEY, widgetKey);
