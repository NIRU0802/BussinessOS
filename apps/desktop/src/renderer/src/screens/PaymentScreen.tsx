import { useState } from 'react'
import PriceTag from '../components/PriceTag'
import type { PaymentLineItem } from '../lib/paymentLine'
import { decimalToString } from '../lib/money'

interface OrderSummary {
  id: string
  subtotal: string
  taxAmount: string
  total: string
}

interface PaymentScreenProps {
  order: OrderSummary
  submittedItems: PaymentLineItem[]
  onPaymentComplete: () => void
  onCancel: () => void
}

type TenderMethod = 'cash' | 'card' | 'upi' | 'other'

interface Tender {
  id: string
  method: TenderMethod
  amount: string
}

const METHOD_LABELS: Record<TenderMethod, string> = {
  cash: 'Cash',
  card: 'Card',
  upi: 'UPI',
  other: 'Other'
}

export default function PaymentScreen({
  order,
  submittedItems,
  onPaymentComplete,
  onCancel
}: PaymentScreenProps) {
  const orderTotal = Number(order.total)

  const [isSplitting, setIsSplitting] = useState(false)
  const [singleMethod, setSingleMethod] = useState<TenderMethod>('cash')
  const [tenders, setTenders] = useState<Tender[]>([
    { id: crypto.randomUUID(), method: 'cash', amount: order.total }
  ])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const tenderSum = tenders.reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
  const remaining = orderTotal - tenderSum
  const tenderSumMatches = Math.abs(remaining) < 0.01

  function addTender(): void {
    setTenders((prev) => [...prev, { id: crypto.randomUUID(), method: 'cash', amount: '0.00' }])
  }

  function updateTender(id: string, patch: Partial<Tender>): void {
    setTenders((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))
  }

  function removeTender(id: string): void {
    setTenders((prev) => prev.filter((t) => t.id !== id))
  }

  async function handleConfirm(): Promise<void> {
    setError(null)

    const shares = isSplitting
      ? tenders.map((t) => ({ method: t.method, amount: decimalToString(Number(t.amount) || 0) }))
      : [{ method: singleMethod, amount: order.total }]

    if (isSplitting && !tenderSumMatches) {
      setError(
        `Amounts must add up to the order total. Currently off by ₹${Math.abs(remaining).toFixed(2)}.`
      )
      return
    }

    setIsSubmitting(true)
    try {
      const result = await window.api.orders.splitBill(order.id, { mode: 'equal_share', shares })
      if (!result.success) {
        setError(result.error ?? 'Failed to record payment.')
        return
      }
      onPaymentComplete()
    } catch {
      setError('Failed to record payment. Please retry.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex h-full" style={{ background: 'var(--paper-50)' }}>
      <div className="flex-1 overflow-y-auto p-8">
        <h2
          className="mb-6 text-2xl"
          style={{ fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--ink-900)' }}
        >
          Order summary
        </h2>
        {submittedItems.map((line) => (
          <div
            key={line.lineId}
            className="mb-3 flex items-start justify-between border-b pb-3"
            style={{ borderColor: 'var(--border)' }}
          >
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--ink-900)' }}>
                {line.name}
                {line.variantName && (
                  <span style={{ color: 'var(--ink-400)' }}> ({line.variantName})</span>
                )}
                <span style={{ color: 'var(--ink-400)' }}> × {line.quantity}</span>
              </p>
              {line.modifierNames.length > 0 && (
                <p className="mt-0.5 text-xs" style={{ color: 'var(--ink-400)' }}>
                  {line.modifierNames.join(', ')}
                </p>
              )}
              {line.notes && (
                <p className="mt-0.5 text-xs italic" style={{ color: 'var(--ink-400)' }}>
                  "{line.notes}"
                </p>
              )}
            </div>
            <PriceTag amount={line.unitPrice * line.quantity} size="sm" />
          </div>
        ))}

        <div className="mt-6 space-y-2 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
          <div className="flex justify-between text-sm" style={{ color: 'var(--ink-600)' }}>
            <span>Subtotal</span>
            <PriceTag amount={Number(order.subtotal)} size="sm" />
          </div>
          <div className="flex justify-between text-sm" style={{ color: 'var(--ink-600)' }}>
            <span>Tax</span>
            <PriceTag amount={Number(order.taxAmount)} size="sm" />
          </div>
          <div
            className="flex items-center justify-between border-t pt-3"
            style={{ borderColor: 'var(--border)' }}
          >
            <span className="text-sm font-semibold" style={{ color: 'var(--ink-900)' }}>
              Total
            </span>
            <PriceTag amount={orderTotal} size="lg" color="accent" />
          </div>
        </div>
      </div>

      <div
        className="w-[420px] flex-shrink-0 border-l p-8"
        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
      >
        <h2
          className="mb-6 text-2xl"
          style={{ fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--ink-900)' }}
        >
          Payment
        </h2>

        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setIsSplitting(false)}
            className="flex-1 rounded-full py-3 text-sm font-semibold transition"
            style={
              !isSplitting
                ? { background: 'var(--ink-900)', color: '#fff' }
                : { border: '2px solid var(--border)', color: 'var(--ink-600)' }
            }
          >
            Single payment
          </button>
          <button
            onClick={() => setIsSplitting(true)}
            className="flex-1 rounded-full py-3 text-sm font-semibold transition"
            style={
              isSplitting
                ? { background: 'var(--ink-900)', color: '#fff' }
                : { border: '2px solid var(--border)', color: 'var(--ink-600)' }
            }
          >
            Split payment
          </button>
        </div>

        {!isSplitting && (
          <div className="mb-8">
            <p
              className="mb-3 text-xs font-bold uppercase tracking-wide"
              style={{ color: 'var(--ink-400)' }}
            >
              Payment method
            </p>
            <div className="grid grid-cols-2 gap-3">
              {(Object.keys(METHOD_LABELS) as TenderMethod[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setSingleMethod(m)}
                  className="rounded-xl border-2 py-4 text-sm font-semibold transition"
                  style={
                    singleMethod === m
                      ? {
                          background: 'var(--ink-900)',
                          borderColor: 'var(--ink-900)',
                          color: '#fff'
                        }
                      : { borderColor: 'var(--border)', color: 'var(--ink-600)' }
                  }
                >
                  {METHOD_LABELS[m]}
                </button>
              ))}
            </div>
            <div className="mt-6 text-center">
              <PriceTag amount={orderTotal} size="xl" color="accent" />
            </div>
          </div>
        )}

        {isSplitting && (
          <div className="mb-8">
            {tenders.map((t) => (
              <div key={t.id} className="mb-3 flex items-center gap-2">
                <select
                  value={t.method}
                  onChange={(e) => updateTender(t.id, { method: e.target.value as TenderMethod })}
                  className="rounded-xl border-2 p-2.5 text-sm"
                  style={{ borderColor: 'var(--border)' }}
                >
                  {(Object.keys(METHOD_LABELS) as TenderMethod[]).map((m) => (
                    <option key={m} value={m}>
                      {METHOD_LABELS[m]}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  step="0.01"
                  value={t.amount}
                  onChange={(e) => updateTender(t.id, { amount: e.target.value })}
                  className="flex-1 rounded-xl border-2 p-2.5 text-sm"
                  style={{ borderColor: 'var(--border)' }}
                />
                {tenders.length > 1 && (
                  <button
                    onClick={() => removeTender(t.id)}
                    className="text-xs font-semibold"
                    style={{ color: 'var(--accent-600)' }}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={addTender}
              className="mt-1 text-sm font-semibold underline"
              style={{ color: 'var(--ink-600)' }}
            >
              + Add another payment method
            </button>
            <p
              className="mt-4 text-sm font-medium"
              style={{ color: tenderSumMatches ? 'var(--sage-600)' : 'var(--accent-600)' }}
            >
              {tenderSumMatches
                ? 'Amounts match the total ✓'
                : `Remaining: ₹${remaining.toFixed(2)}`}
            </p>
          </div>
        )}

        {error && (
          <p className="mb-4 text-sm font-medium" style={{ color: 'var(--accent-600)' }}>
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1 rounded-full border-2 py-4 text-sm font-semibold"
            style={{ borderColor: 'var(--border)', color: 'var(--ink-600)' }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isSubmitting || (isSplitting && !tenderSumMatches)}
            className="flex-[2] rounded-full py-4 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-40"
            style={{ background: 'var(--accent-600)' }}
          >
            {isSubmitting ? 'Processing…' : 'Confirm payment'}
          </button>
        </div>
      </div>
    </div>
  )
}
