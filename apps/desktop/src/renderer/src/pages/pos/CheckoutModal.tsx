import { useState } from 'react'
import { useCart } from '../../state/CartContext'
import type { CreateOrderPayload } from '../../types/pos'

interface CheckoutModalProps {
  branchId: string
  deviceId: string
  tableId?: string
  onClose: () => void
  onOrderPlaced: () => void
}

interface AttemptCreateOrderResult {
  success: boolean
  order?: unknown
  error?: string
  queued?: boolean
}

export function CheckoutModal({
  branchId,
  deviceId,
  tableId,
  onClose,
  onOrderPlaced
}: CheckoutModalProps) {
  const { lines, totals, clear } = useCart()
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

  async function handleConfirm() {
    setSubmitting(true)
    setResult(null)

    const payload: CreateOrderPayload = {
      branchId,
      tableId,
      deviceId,
      clientGeneratedId: crypto.randomUUID(),
      channel: 'pos',
      items: lines.map((l) => ({
        productId: l.productId,
        quantity: l.quantity,
        unitPrice: l.unitPrice.toFixed(2),
        modifiers:
          l.modifiers.length > 0
            ? { selections: l.modifiers.map((m) => ({ groupId: m.groupId, optionId: m.optionId })) }
            : undefined
      })),
      subtotal: totals.subtotal.toFixed(2),
      taxAmount: totals.taxAmount.toFixed(2),
      total: totals.total.toFixed(2)
    }

    const response = (await window.api.orders.create(payload)) as AttemptCreateOrderResult

    setSubmitting(false)

    if (response.success) {
      setResult({
        ok: true,
        message: response.queued
          ? 'Order saved offline — it will sync automatically once back online.'
          : 'Order placed successfully.'
      })
      clear()
      onOrderPlaced()
    } else {
      setResult({ ok: false, message: response.error ?? 'Failed to place order.' })
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="flex max-h-[85vh] w-full max-w-[480px] flex-col overflow-hidden rounded-3xl shadow-2xl"
        style={{ background: 'var(--surface)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b px-7 py-6" style={{ borderColor: 'var(--border)' }}>
          <h2
            className="text-2xl"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--ink-900)' }}
          >
            Confirm Order
          </h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--ink-400)' }}>
            Review the order before sending it to payment.
          </p>
        </div>

        {/* Line items */}
        <div className="flex-1 overflow-y-auto px-7 py-5">
          <div className="space-y-3">
            {lines.map((l) => {
              const lineTotal =
                (l.unitPrice + l.modifiers.reduce((s, m) => s + m.priceDelta, 0)) * l.quantity
              return (
                <div key={l.lineId} className="flex items-start justify-between gap-4 text-sm">
                  <div className="flex min-w-0 gap-2">
                    <span
                      className="flex h-5 min-w-5 flex-shrink-0 items-center justify-center rounded-full px-1 text-[11px] font-bold"
                      style={{ background: 'var(--paper-50)', color: 'var(--ink-700)' }}
                    >
                      {l.quantity}
                    </span>
                    <span className="truncate font-medium" style={{ color: 'var(--ink-900)' }}>
                      {l.name}
                    </span>
                  </div>
                  <span className="price-display flex-shrink-0" style={{ color: 'var(--ink-900)' }}>
                    <span className="currency-symbol">₹</span>
                    {lineTotal.toFixed(2)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Totals */}
        <div
          className="border-t px-7 py-5"
          style={{ borderColor: 'var(--border)', background: 'var(--paper-50)' }}
        >
          <div className="space-y-2 text-sm" style={{ color: 'var(--ink-500)' }}>
            <div className="flex items-center justify-between">
              <span>Subtotal</span>
              <span className="price-display">
                <span className="currency-symbol">₹</span>
                {totals.subtotal.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Tax</span>
              <span className="price-display">
                <span className="currency-symbol">₹</span>
                {totals.taxAmount.toFixed(2)}
              </span>
            </div>
            <div className="my-2 border-t border-dashed" style={{ borderColor: 'var(--border)' }} />
            <div className="flex items-center justify-between">
              <span className="text-base font-bold" style={{ color: 'var(--ink-900)' }}>
                Total
              </span>
              <span className="price-display text-lg" style={{ color: 'var(--accent-600)' }}>
                <span className="currency-symbol">₹</span>
                {totals.total.toFixed(2)}
              </span>
            </div>
          </div>

          {result && (
            <div
              className="mt-4 rounded-xl px-3 py-2.5 text-xs font-medium"
              style={
                result.ok
                  ? { background: 'var(--sage-50)', color: 'var(--sage-700)' }
                  : { background: 'var(--accent-50)', color: 'var(--accent-700)' }
              }
            >
              {result.message}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 border-t px-7 py-5" style={{ borderColor: 'var(--border)' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 rounded-full border-2 py-3.5 text-sm font-semibold transition hover:bg-black/5 disabled:opacity-40"
            style={{ borderColor: 'var(--border)', color: 'var(--ink-600)' }}
          >
            {result?.ok ? 'Close' : 'Cancel'}
          </button>

          {!result?.ok && (
            <button
              type="button"
              onClick={handleConfirm}
              disabled={submitting || lines.length === 0}
              className="flex-[2] rounded-full py-3.5 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-40"
              style={{ background: 'var(--accent-600)' }}
            >
              {submitting ? 'Placing order…' : 'Confirm & Place Order'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
