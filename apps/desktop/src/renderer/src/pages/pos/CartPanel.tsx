import { useCart } from '../../state/CartContext'
import PriceTag from '../../components/PriceTag'

interface CartPanelProps {
  onCheckout: () => void
}

export default function CartPanel({ onCheckout }: CartPanelProps) {
  const { lines, totals, increment, decrement, removeLine } = useCart()

  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0)

  return (
    <aside
      className="flex h-full min-h-0 flex-col overflow-hidden border-l"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      {/* Header */}
      <div className="flex-shrink-0 border-b px-6 py-5" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2">
          <h2
            className="text-xl"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--ink-900)' }}
          >
            Current Order
          </h2>

          {itemCount > 0 && (
            <span
              className="flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-bold"
              style={{ background: 'var(--paper-50)', color: 'var(--ink-700)' }}
            >
              {itemCount}
            </span>
          )}
        </div>
        <p className="mt-1 text-xs" style={{ color: 'var(--ink-400)' }}>
          Add items from the menu to build this order.
        </p>
      </div>

      {/* Lines */}
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {lines.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <div
              className="mb-4 flex h-16 w-16 items-center justify-center rounded-full"
              style={{ background: 'var(--paper-50)' }}
            >
              <span className="text-2xl" style={{ color: 'var(--ink-400)' }}>
                🛒
              </span>
            </div>
            <h3 className="text-base font-bold" style={{ color: 'var(--ink-900)' }}>
              Your order is empty
            </h3>
            <p className="mt-1 max-w-[220px] text-xs leading-5" style={{ color: 'var(--ink-400)' }}>
              Select an item from the menu to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {lines.map((line) => {
              const modifierTotal = line.modifiers.reduce((sum, m) => sum + m.priceDelta, 0)
              const lineTotal = (line.unitPrice + modifierTotal) * line.quantity

              return (
                <div
                  key={line.lineId}
                  className="rounded-2xl border p-4"
                  style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3
                        className="truncate text-sm font-bold"
                        style={{ color: 'var(--ink-900)' }}
                      >
                        {line.name}
                      </h3>

                      {line.modifiers.length > 0 && (
                        <p className="mt-1 text-xs leading-5" style={{ color: 'var(--ink-400)' }}>
                          {line.modifiers.map((m) => m.optionName).join(' • ')}
                        </p>
                      )}

                      {line.notes && (
                        <p
                          className="mt-2 rounded-xl px-3 py-2 text-xs italic"
                          style={{ background: 'var(--paper-50)', color: 'var(--ink-500)' }}
                        >
                          “{line.notes}”
                        </p>
                      )}
                    </div>

                    <div className="flex-shrink-0 text-right">
                      <PriceTag amount={lineTotal} size="sm" color="ink" />
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <div
                      className="flex items-center overflow-hidden rounded-full border"
                      style={{ borderColor: 'var(--border)' }}
                    >
                      <button
                        type="button"
                        aria-label={`Decrease ${line.name}`}
                        onClick={() => decrement(line.lineId)}
                        className="flex h-8 w-8 items-center justify-center text-base font-semibold transition hover:bg-black/5"
                        style={{ color: 'var(--ink-900)' }}
                      >
                        −
                      </button>
                      <span
                        className="min-w-8 text-center text-xs font-bold"
                        style={{ color: 'var(--ink-900)' }}
                      >
                        {line.quantity}
                      </span>
                      <button
                        type="button"
                        aria-label={`Increase ${line.name}`}
                        onClick={() => increment(line.lineId)}
                        className="flex h-8 w-8 items-center justify-center text-base font-semibold transition hover:bg-black/5"
                        style={{ color: 'var(--ink-900)' }}
                      >
                        +
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeLine(line.lineId)}
                      className="rounded-full px-3 py-1.5 text-xs font-semibold transition hover:bg-black/5"
                      style={{ color: 'var(--accent-600)' }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 border-t px-6 py-5" style={{ borderColor: 'var(--border)' }}>
        <div className="mb-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: 'var(--ink-500)' }}>
              Subtotal
            </span>
            <PriceTag amount={totals.subtotal} size="sm" color="ink" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: 'var(--ink-500)' }}>
              Tax
            </span>
            <PriceTag amount={totals.taxAmount} size="sm" color="ink" />
          </div>
          <div
            className="flex items-center justify-between border-t pt-2.5"
            style={{ borderColor: 'var(--border)' }}
          >
            <span className="text-sm font-bold" style={{ color: 'var(--ink-900)' }}>
              Total
            </span>
            <PriceTag amount={totals.total} size="lg" color="accent" />
          </div>
        </div>

        <button
          type="button"
          disabled={lines.length === 0}
          onClick={onCheckout}
          className="flex w-full items-center justify-center rounded-full py-3.5 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-40"
          style={{ background: 'var(--accent-600)' }}
        >
          Proceed to Payment
        </button>
      </div>
    </aside>
  )
}
