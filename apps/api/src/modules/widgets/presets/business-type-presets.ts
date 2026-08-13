/**
 * Business Type Presets — a convenience layer ONLY.
 *
 * These are NOT bundles/packs sold as a unit. They exist purely to
 * bulk-enable a sensible starting set of individually toggleable widgets
 * at tenant signup. Every widget enabled by a preset remains independently
 * toggleable afterward through the normal Widget Registry service.
 */

export const BUSINESS_TYPE_PRESETS = {
  dine_in_restaurant: [
    'pos',
    'menu',
    'tables',
    'reservations',
    'qr_ordering',
    'kds',
    'inventory',
    'crm',
    'reports',
    'expenses',
    'payments',
  ],
  cloud_kitchen: [
    'pos',
    'menu',
    'kds',
    'inventory',
    'crm',
    'reports',
    'expenses',
    'payments',
    'delivery_aggregator',
  ],
  cafe: [
    'pos',
    'menu',
    'tables',
    'qr_ordering',
    'inventory',
    'crm',
    'reports',
    'expenses',
    'payments',
  ],
  food_truck: [
    'pos',
    'menu',
    'inventory',
    'crm',
    'reports',
    'expenses',
    'payments',
  ],
} as const;

export const BUSINESS_TYPE_PRESET_KEYS = Object.keys(
  BUSINESS_TYPE_PRESETS,
) as BusinessTypePresetKey[];

export type BusinessTypePresetKey = keyof typeof BUSINESS_TYPE_PRESETS;
