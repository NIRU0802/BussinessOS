// Integer-cents math to avoid float drift. The API server recomputes
// tax/total authoritatively and silently overrides on mismatch, but does
// NOT recompute or validate subtotal against items[] — so this file is
// the only guard against a cart math bug reaching the database uncaught.

const toPaise = (rupees: number): number => Math.round(rupees * 100)
const toRupees = (paise: number): number => paise / 100

export function lineUnitPrice(
  baseUnitPrice: number,
  variantPriceDelta: number,
  modifierDeltas: number[]
): number {
  const basePaise = toPaise(baseUnitPrice)
  const variantPaise = toPaise(variantPriceDelta)
  const modifierPaise = modifierDeltas.reduce((sum, d) => sum + toPaise(d), 0)
  return toRupees(basePaise + variantPaise + modifierPaise)
}

export function lineTotal(unitPrice: number, quantity: number): number {
  return toRupees(toPaise(unitPrice) * quantity)
}

export function sumLines(lineTotals: number[]): number {
  const totalPaise = lineTotals.reduce((sum, t) => sum + toPaise(t), 0)
  return toRupees(totalPaise)
}

// Display-only estimate. Server is authoritative on actual tax charged.
export function estimateTaxDisplay(subtotal: number, ratePercent: number): number {
  return toRupees(Math.round(toPaise(subtotal) * (ratePercent / 100)))
}

export function formatCurrency(rupees: number, currencySymbol = '₹'): string {
  return `${currencySymbol}${rupees.toFixed(2)}`
}

export function decimalToString(rupees: number): string {
  return rupees.toFixed(2)
}

// Splits a formatted price into symbol + amount so components can apply
// the price-display typographic treatment (smaller, raised ₹ symbol).
export function splitCurrencyDisplay(
  rupees: number,
  currencySymbol = '₹'
): { symbol: string; amount: string } {
  return { symbol: currencySymbol, amount: rupees.toFixed(2) }
}
