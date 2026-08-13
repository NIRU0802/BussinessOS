import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTaxClassDto } from './dto/create-tax-class.dto';
import { CreateTaxRuleDto } from './dto/create-tax-rule.dto';
import {
  TaxResolutionInput,
  TaxResolutionResult,
} from './interfaces/tax-resolution.interface';

@Injectable()
export class TaxService {
  constructor(private readonly prisma: PrismaService) {}

  async createTaxClass(tenantId: string, dto: CreateTaxClassDto) {
    if (dto.isDefault) {
      await this.prisma.taxClass.updateMany({
        where: { tenantId, isDefault: true },
        data: { isDefault: false },
      });
    }
    return this.prisma.taxClass.create({
      data: { tenantId, ...dto },
    });
  }

  async createTaxRule(tenantId: string, dto: CreateTaxRuleDto) {
    const taxClass = await this.prisma.taxClass.findFirst({
      where: { id: dto.taxClassId, tenantId },
    });
    if (!taxClass) throw new NotFoundException('Tax class not found');

    return this.prisma.taxRule.create({
      data: {
        tenantId,
        taxClassId: dto.taxClassId,
        country: dto.country.toUpperCase(),
        state: dto.state ? dto.state.toUpperCase() : null,
        taxType: dto.taxType,
        components: dto.components as any,
        effectiveFrom: dto.effectiveFrom
          ? new Date(dto.effectiveFrom)
          : new Date(),
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
      },
    });
  }

  async resolveTax(input: TaxResolutionInput): Promise<TaxResolutionResult> {
    const asOf = input.asOf ?? new Date();

    const candidates = await this.prisma.taxRule.findMany({
      where: {
        tenantId: input.tenantId,
        taxClassId: input.taxClassId,
        country: input.country.toUpperCase(),
        effectiveFrom: { lte: asOf },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: asOf } }],
      },
    });

    if (candidates.length === 0) {
      return {
        taxType: 'NONE',
        components: [],
        totalTaxAmount: 0,
        totalTaxRate: 0,
        grandTotal: this.round(input.amount),
      };
    }

    const stateSpecific = input.state
      ? candidates.find((c) => c.state === input.state!.toUpperCase())
      : undefined;
    const rule = stateSpecific ?? candidates.find((c) => c.state === null);

    if (!rule) {
      return {
        taxType: 'NONE',
        components: [],
        totalTaxAmount: 0,
        totalTaxRate: 0,
        grandTotal: this.round(input.amount),
      };
    }

    const components = rule.components as unknown as {
      label: string;
      rate: number;
    }[];
    const totalTaxRate = components.reduce((sum, c) => sum + c.rate, 0);
    const totalTaxAmount = this.round((input.amount * totalTaxRate) / 100);

    return {
      taxType: rule.taxType,
      components,
      totalTaxAmount,
      totalTaxRate,
      grandTotal: this.round(input.amount + totalTaxAmount),
    };
  }

  async listTaxClasses(tenantId: string) {
    return this.prisma.taxClass.findMany({
      where: { tenantId },
      include: { rules: true },
    });
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
