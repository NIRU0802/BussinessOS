import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const CURRENCY_LOCALE_MAP: Record<string, string> = {
  INR: 'en-IN',
  USD: 'en-US',
  EUR: 'de-DE',
  GBP: 'en-GB',
  AED: 'ar-AE',
  SGD: 'en-SG',
  AUD: 'en-AU',
  CAD: 'en-CA',
};

@Injectable()
export class CurrencyService {
  constructor(private readonly prisma: PrismaService) {}

  async getTenantCurrency(tenantId: string): Promise<string> {
    const setting = await this.prisma.tenantLocaleSetting.findUnique({
      where: { tenantId },
    });
    return setting?.baseCurrency ?? 'INR';
  }

  async setTenantCurrency(tenantId: string, currency: string) {
    return this.prisma.tenantLocaleSetting.upsert({
      where: { tenantId },
      update: { baseCurrency: currency.toUpperCase() },
      create: { tenantId, baseCurrency: currency.toUpperCase() },
    });
  }

  format(amount: number, currency: string): string {
    const locale = CURRENCY_LOCALE_MAP[currency.toUpperCase()] ?? 'en-US';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  }

  async formatForTenant(tenantId: string, amount: number): Promise<string> {
    const currency = await this.getTenantCurrency(tenantId);
    return this.format(amount, currency);
  }

  getSupportedCurrencies(): string[] {
    return Object.keys(CURRENCY_LOCALE_MAP);
  }
}
