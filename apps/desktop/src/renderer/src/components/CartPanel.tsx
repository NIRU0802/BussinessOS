import PriceTag from './PriceTag'
import { lineTotal, sumLines, estimateTaxDisplay, lineUnitPrice } from '../lib/money'
import type { SelectedModifierOption } from './ItemCustomizeModal'

export interface CartLineItem {
  lineId: string
  productId: string
  name: string
  variantId: string | null
  variantName: string | null
  variantPriceDelta: number
  selectedModifiers: SelectedModifierOption[]
  baseUnitPrice: number
  quantity: number
  notes: string | null
}

interface CartPanelProps {
  items: CartLineItem[]
  taxRatePercent: number
  onUpdateQuantity: (lineId: string, quantity: number) => void
  onRemoveLine: (lineId: string) => void
  onCheckout: () => void
  isSubmitting: boolean
  disabled?: boolean
  disabledReason?: string
}

function getLineUnitPrice(line: CartLineItem): number {
  return lineUnitPrice(
    line.baseUnitPrice,
    line.variantPriceDelta,
    line.selectedModifiers.map((m) => m.priceDelta)
  )
}

export default function CartPanel({
  items,
  taxRatePercent,
  onUpdateQuantity,
  onRemoveLine,
  onCheckout,
  isSubmitting,
  disabled,
  disabledReason
}: CartPanelProps) {
  const lineTotals = items.map((line) => lineTotal(getLineUnitPrice(line), line.quantity))
  const subtotal = sumLines(lineTotals)
  const estimatedTax = estimateTaxDisplay(subtotal, taxRatePercent)
  const estimatedTotal = subtotal + estimatedTax

  return (
    <div className="cart-panel" style={{ height: '100%' }}>
      <div className="cart-header">
        <div className="cart-title-row">
          <span className="cart-title">Current order</span>
        </div>
      </div>

      <div className="cart-items">
        {items.length === 0 && (
          <div className="cart-empty">No items yet — tap a menu item to add it</div>
        )}

        {items.map((line, idx) => (
          <div key={line.lineId} className="cart-line">
            <div className="cart-line-main">
              <div>
                <p className="cart-line-name">
                  {line.name}
                  {line.variantName && (
                    <span style={{ color: 'var(--ink-400)', fontWeight: 500 }}>
                      {' '}
                      ({line.variantName})
                    </span>
                  )}
                </p>
                {line.selectedModifiers.length > 0 && (
                  <p className="cart-line-detail">
                    {line.selectedModifiers.map((m) => m.optionName).join(', ')}
                  </p>
                )}
                {line.notes && (
                  <p className="cart-line-detail" style={{ fontStyle: 'italic' }}>
                    "{line.notes}"
                  </p>
                )}
              </div>
              <button onClick={() => onRemoveLine(line.lineId)} className="remove-button">
                Remove
              </button>
            </div>

            <div className="cart-line-actions">
              <div className="qty-control">
                <button
                  onClick={() => onUpdateQuantity(line.lineId, line.quantity - 1)}
                  className="qty-button"
                >
                  −
                </button>
                <span className="qty-value">{line.quantity}</span>
                <button
                  onClick={() => onUpdateQuantity(line.lineId, line.quantity + 1)}
                  className="qty-button"
                >
                  +
                </button>
              </div>
              <PriceTag amount={lineTotals[idx]} size="sm" />
            </div>
          </div>
        ))}
      </div>

      <div className="cart-footer">
        <div className="summary-row">
          <span>Subtotal</span>
          <PriceTag amount={subtotal} size="sm" />
        </div>
        <div className="summary-row">
          <span>Tax (est.)</span>
          <PriceTag amount={estimatedTax} size="sm" />
        </div>
        <div className="summary-total">
          <span className="summary-total-label">Total</span>
          <PriceTag amount={estimatedTotal} size="lg" color="accent" />
        </div>

        {disabled && disabledReason && (
          <p className="notice warning" style={{ marginTop: '12px', textAlign: 'center' }}>
            {disabledReason}
          </p>
        )}

        <button
          disabled={items.length === 0 || isSubmitting || disabled}
          onClick={onCheckout}
          className="checkout-button"
        >
          {isSubmitting ? 'Placing order…' : 'Proceed to payment'}
        </button>
      </div>
    </div>
  )
}
