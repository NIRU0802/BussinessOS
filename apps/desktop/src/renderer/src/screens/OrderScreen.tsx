import { useEffect, useState } from 'react'
import MenuGrid, { EffectiveMenuItem } from '../components/MenuGrid'
import ItemCustomizeModal, {
  CustomizeResult,
  SelectedModifierOption
} from '../components/ItemCustomizeModal'
import CartPanel, { CartLineItem } from '../components/CartPanel'
import type { PaymentLineItem } from '../lib/paymentLine'

interface OrderScreenProps {
  branchId: string
  tableId: string | null
  sessionMode: 'online' | 'offline'
  taxRatePercent: number
  onOrderCreated: (order: unknown, submittedItems: PaymentLineItem[]) => void
  onLogout: () => void
  onBackToTables: () => void
}

function makeLineId(): string {
  return crypto.randomUUID()
}

export default function OrderScreen({
  branchId,
  tableId,
  sessionMode,
  taxRatePercent,
  onOrderCreated,
  onLogout,
  onBackToTables
}: OrderScreenProps) {
  const [menuItems, setMenuItems] = useState<EffectiveMenuItem[]>([])
  const [isLoadingMenu, setIsLoadingMenu] = useState(true)
  const [menuError, setMenuError] = useState<string | null>(null)
  const [activeItem, setActiveItem] = useState<EffectiveMenuItem | null>(null)
  const [cartItems, setCartItems] = useState<CartLineItem[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [queuedNotice, setQueuedNotice] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setIsLoadingMenu(true)
    setMenuError(null)

    window.api.menu
      .getEffective(branchId)
      .then((result) => {
        if (cancelled) return
        if (!result.success) {
          setMenuError(result.error ?? 'Failed to load menu.')
          return
        }
        setMenuItems((result.items ?? []) as EffectiveMenuItem[])
      })
      .catch(() => {
        if (!cancelled) setMenuError('Failed to load menu.')
      })
      .finally(() => {
        if (!cancelled) setIsLoadingMenu(false)
      })

    return () => {
      cancelled = true
    }
  }, [branchId])

  const handleConfirmCustomize = (result: CustomizeResult) => {
    if (!activeItem) return
    const line: CartLineItem = {
      lineId: makeLineId(),
      productId: activeItem.id,
      name: activeItem.name,
      variantId: result.variant?.id ?? null,
      variantName: result.variant?.name ?? null,
      variantPriceDelta: result.variant?.priceDelta ?? 0,
      selectedModifiers: result.selectedModifiers,
      baseUnitPrice: activeItem.effectivePrice,
      quantity: result.quantity,
      notes: result.notes
    }
    setCartItems((prev) => [...prev, line])
    setActiveItem(null)
  }

  const handleUpdateQuantity = (lineId: string, quantity: number) => {
    setCartItems((prev) =>
      quantity <= 0
        ? prev.filter((i) => i.lineId !== lineId)
        : prev.map((i) => (i.lineId === lineId ? { ...i, quantity } : i))
    )
  }

  const handleRemoveLine = (lineId: string) => {
    setCartItems((prev) => prev.filter((i) => i.lineId !== lineId))
  }

  function handleChangeTable(): void {
    if (cartItems.length > 0) {
      const confirmed = window.confirm(
        "You have items in this order that haven't been sent yet. Going back to tables will discard them. Continue?"
      )
      if (!confirmed) return
    }
    onBackToTables()
  }

  const handleCheckout = async () => {
    setIsSubmitting(true)
    setSubmitError(null)
    setQueuedNotice(null)
    try {
      const deviceId = await window.api.device.getDeviceId()
      const { lineUnitPrice, lineTotal, sumLines, decimalToString } = await import('../lib/money')

      const apiItems = cartItems.map((line) => {
        const unitPrice = lineUnitPrice(
          line.baseUnitPrice,
          line.variantPriceDelta,
          line.selectedModifiers.map((m) => m.priceDelta)
        )
        return {
          productId: line.productId,
          quantity: line.quantity,
          unitPrice: decimalToString(unitPrice),
          modifiers: {
            selections: [
              ...(line.variantId
                ? [
                    {
                      type: 'variant',
                      variantId: line.variantId,
                      name: line.variantName,
                      priceDelta: line.variantPriceDelta
                    }
                  ]
                : []),
              ...line.selectedModifiers.map((m: SelectedModifierOption) => ({
                type: 'modifier',
                groupId: m.groupId,
                groupName: m.groupName,
                optionId: m.optionId,
                name: m.optionName,
                priceDelta: m.priceDelta
              }))
            ],
            ...(line.notes ? { notes: line.notes } : {})
          }
        }
      })

      const lineTotals = cartItems.map((line) =>
        lineTotal(
          lineUnitPrice(
            line.baseUnitPrice,
            line.variantPriceDelta,
            line.selectedModifiers.map((m) => m.priceDelta)
          ),
          line.quantity
        )
      )
      const subtotal = sumLines(lineTotals)

      const result = await window.api.orders.create({
        branchId,
        ...(tableId ? { tableId } : {}),
        deviceId,
        clientGeneratedId: crypto.randomUUID(),
        channel: 'pos',
        items: apiItems,
        subtotal: decimalToString(subtotal),
        taxAmount: '0.00',
        total: decimalToString(subtotal)
      })

      if (result.queued) {
        setQueuedNotice(
          'No connection — this order has been saved and will sync automatically. You can start a new order now.'
        )
        setCartItems([])
        return
      }

      if (!result.success) {
        setSubmitError(result.error ?? 'Failed to create order.')
        return
      }

      const submittedItems: PaymentLineItem[] = cartItems.map((line) => ({
        lineId: line.lineId,
        name: line.name,
        variantName: line.variantName,
        modifierNames: line.selectedModifiers.map((m) => m.optionName),
        notes: line.notes,
        unitPrice: lineUnitPrice(
          line.baseUnitPrice,
          line.variantPriceDelta,
          line.selectedModifiers.map((m) => m.priceDelta)
        ),
        quantity: line.quantity
      }))
      setCartItems([])
      onOrderCreated(result.order, submittedItems)
    } catch {
      setSubmitError('Failed to create order. Please retry.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoadingMenu) {
    return (
      <div
        className="flex h-full items-center justify-center"
        style={{ background: 'var(--paper-50)' }}
      >
        <p style={{ color: 'var(--ink-400)' }}>Loading menu…</p>
      </div>
    )
  }

  if (menuError) {
    return (
      <div
        className="flex h-full flex-col items-center justify-center gap-4"
        style={{ background: 'var(--paper-50)' }}
      >
        <p style={{ color: 'var(--ink-600)' }}>{menuError}</p>
      </div>
    )
  }

  return (
    <div className="pos-shell-single">
      <div className="pos-topbar">
        <div>
          <div className="pos-title">Taking order</div>
          <div className="pos-subtitle">{tableId ? 'Dine-in' : 'Takeaway / Counter'}</div>
        </div>
        <div className="pos-top-actions">
          <span className="status-chip">
            <span className={`status-dot${sessionMode === 'offline' ? ' offline' : ''}`} />
            {sessionMode === 'offline' ? 'Offline' : 'Online'}
          </span>
          <button onClick={handleChangeTable} className="ui-button">
            Change table
          </button>
          <button onClick={onLogout} className="ui-button">
            Log out
          </button>
        </div>
      </div>

      <div className="pos-order-layout" style={{ flex: 1, minHeight: 0 }}>
        <div className="menu-workspace">
          <MenuGrid items={menuItems} onSelectItem={setActiveItem} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <CartPanel
            items={cartItems}
            taxRatePercent={taxRatePercent}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveLine={handleRemoveLine}
            onCheckout={handleCheckout}
            isSubmitting={isSubmitting}
            disabled={sessionMode === 'offline'}
            disabledReason={
              sessionMode === 'offline'
                ? "Reconnect to take orders — offline mode can't reach the server."
                : undefined
            }
          />
          {submitError && (
            <p
              className="p-3 text-center text-sm font-medium"
              style={{ color: 'var(--accent-600)' }}
            >
              {submitError}
            </p>
          )}
          {queuedNotice && (
            <p
              className="p-3 text-center text-sm font-medium"
              style={{ color: 'var(--amber-500)' }}
            >
              {queuedNotice}
            </p>
          )}
        </div>
      </div>

      {activeItem && (
        <ItemCustomizeModal
          item={activeItem}
          onConfirm={handleConfirmCustomize}
          onClose={() => setActiveItem(null)}
        />
      )}
    </div>
  )
}
