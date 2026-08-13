import { IsIn } from 'class-validator';

const SUPPORTED = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'AUD', 'CAD'];

export class SetCurrencyDto {
  @IsIn(SUPPORTED)
  currency: string;
}
