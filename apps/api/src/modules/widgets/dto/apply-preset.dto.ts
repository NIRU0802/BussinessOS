import { IsIn } from 'class-validator';
import { BUSINESS_TYPE_PRESET_KEYS } from '../presets/business-type-presets';
import type { BusinessTypePresetKey } from '../presets/business-type-presets';

export class ApplyPresetDto {
  @IsIn(BUSINESS_TYPE_PRESET_KEYS)
  presetKey: BusinessTypePresetKey;
}
