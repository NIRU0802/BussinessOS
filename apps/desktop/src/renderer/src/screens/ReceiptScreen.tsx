import { useState } from 'react'
import { formatCurrency } from '../lib/money'
import type { PaymentLineItem } from '../lib/paymentLine'

interface OrderSummary {
  id: string
  subtotal: string
  taxAmount: string
  total: string
}

interface ReceiptScreenProps {
  order: OrderSummary
  submittedItems: PaymentLineItem[]
  tenantSlug: string
  tableLabel: string | null
  onDone: () => void
}

export default function ReceiptScreen({
  order,
  submittedItems,
  tenantSlug,
  tableLabel,
  onDone
}: ReceiptScreenProps) {
  const [printedAt] = useState(() => new Date())

  function handlePrint(): void {
    window.print()
  }

  return (
    <div className="flex h-full flex-col" style={{ background: 'var(--paper-50)' }}>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #receipt-print-area, #receipt-print-area * { visibility: visible; }
          #receipt-print-area {
            position: absolute; top: 0; left: 0; width: 80mm; padding: 4mm;
            font-family: var(--font-mono); font-size: 11px;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="flex-1 overflow-y-auto p-8">
        <div
          id="receipt-print-area"
          className="mx-auto w-[340px] rounded-2xl p-8 shadow-sm"
          style={{
            background: 'var(--surface)',
            fontFamily: 'var(--font-mono)',
            color: 'var(--ink-900)'
          }}
        >
          <div className="mb-4 text-center">
            <p className="text-base font-bold uppercase tracking-wide">{tenantSlug}</p>
            <p className="mt-1 text-xs" style={{ color: 'var(--ink-400)' }}>
              {tableLabel ? `Table: ${tableLabel}` : 'Takeaway'}
            </p>
            <p className="text-xs" style={{ color: 'var(--ink-400)' }}>
              {printedAt.toLocaleString()}
            </p>
            <p className="text-xs" style={{ color: 'var(--ink-400)' }}>
              Order #{order.id.slice(0, 8).toUpperCase()}
            </p>
          </div>

          <div className="my-3 border-t border-dashed" style={{ borderColor: 'var(--border)' }} />

          {submittedItems.map((line) => (
            <div key={line.lineId} className="mb-2 text-sm">
              <div className="flex justify-between">
                <span>
                  {line.quantity} × {line.name}
                  {line.variantName ? ` (${line.variantName})` : ''}
                </span>
                <span>{formatCurrency(line.unitPrice * line.quantity)}</span>
              </div>
              {line.modifierNames.length > 0 && (
                <p className="pl-4 text-xs" style={{ color: 'var(--ink-400)' }}>
                  {line.modifierNames.join(', ')}
                </p>
              )}
              {line.notes && (
                <p className="pl-4 text-xs italic" style={{ color: 'var(--ink-400)' }}>
                  "{line.notes}"
                </p>
              )}
            </div>
          ))}

          <div className="my-3 border-t border-dashed" style={{ borderColor: 'var(--border)' }} />

          <div className="text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatCurrency(Number(order.subtotal))}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax</span>
              <span>{formatCurrency(Number(order.taxAmount))}</span>
            </div>
            <div className="mt-1 flex justify-between text-base font-bold">
              <span>Total</span>
              <span>{formatCurrency(Number(order.total))}</span>
            </div>
          </div>

          <div className="my-4 border-t border-dashed" style={{ borderColor: 'var(--border)' }} />
          <p className="text-center text-xs" style={{ color: 'var(--ink-400)' }}>
            Thank you for visiting!
          </p>
        </div>
      </div>

      <div
        className="no-print flex gap-3 border-t p-6"
        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
      >
        <button
          onClick={onDone}
          className="flex-1 rounded-full border-2 py-4 text-sm font-semibold"
          style={{ borderColor: 'var(--border)', color: 'var(--ink-600)' }}
        >
          Skip
        </button>
        <button
          onClick={handlePrint}
          className="flex-[2] rounded-full py-4 text-sm font-bold text-white"
          style={{ background: 'var(--ink-900)' }}
        >
          Print receipt
        </button>
        <button
          onClick={onDone}
          className="flex-1 rounded-full py-4 text-sm font-bold text-white"
          style={{ background: 'var(--sage-600)' }}
        >
          New order
        </button>
      </div>
    </div>
  )
}
