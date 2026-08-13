import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TaxService } from '../tax/tax.service';

// Small tolerance for float/decimal rounding differences between a
// client's locally-computed preview total and the server's recomputed
// value. Anything beyond this is treated as a mismatch and the SERVER
// value always wins — the client's number is a display preview only,
// never the source of truth for what gets charged/recorded.
const TAX_MISMATCH_TOLERANCE = new Prisma.Decimal('0.02');

export interface RecomputedTax {
  taxAmount: Prisma.Decimal;
  total: Prisma.Decimal;
  mismatchDetected: boolean;
}

// Resolves a branch's country + the tenant's default TaxClass, then asks
// TaxService for the authoritative tax on `subtotal`. Any Order Engine
// write path (create, add-items, sync push) MUST go through this rather
// than trusting a client-sent tax figure — devices can be offline,
// outdated, or tampered with; the server recomputes independently every
// time and only ever stores its own number.
export async function recomputeTax(
  prisma: PrismaService,
  taxService: TaxService,
  tenantId: string,
  branchId: string,
  subtotal: Prisma.Decimal,
  clientSentTaxAmount?: Prisma.Decimal,
): Promise<RecomputedTax> {
  const { branch, taxClass } = await prisma.forTenant(tenantId, async (tx) => {
    const branch = await tx.branch.findUnique({ where: { id: branchId } });
    if (!branch) {
      throw new NotFoundException('Branch not found.');
    }
    const taxClass = await tx.taxClass.findFirst({
      where: { tenantId, isDefault: true },
    });
    return { branch, taxClass };
  });

  // No default tax class configured for this tenant yet — fall back to
  // zero tax rather than throwing, since not every tenant will have
  // configured the Tax Engine on day one (e.g. still in onboarding).
  if (!taxClass) {
    const taxAmount = new Prisma.Decimal(0);
    return {
      taxAmount,
      total: subtotal,
      mismatchDetected: clientSentTaxAmount
        ? !clientSentTaxAmount.equals(taxAmount)
        : false,
    };
  }

  const result = await taxService.resolveTax({
    tenantId,
    country: branch.country,
    taxClassId: taxClass.id,
    amount: subtotal.toNumber(),
  });

  const serverTaxAmount = new Prisma.Decimal(result.totalTaxAmount);
  const serverTotal = new Prisma.Decimal(result.grandTotal);

  const mismatchDetected = clientSentTaxAmount
    ? clientSentTaxAmount
        .sub(serverTaxAmount)
        .abs()
        .greaterThan(TAX_MISMATCH_TOLERANCE)
    : false;

  return { taxAmount: serverTaxAmount, total: serverTotal, mismatchDetected };
}
