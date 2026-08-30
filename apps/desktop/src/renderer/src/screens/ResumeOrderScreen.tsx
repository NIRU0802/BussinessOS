import { useEffect, useMemo, useState } from 'react'
import type { EffectiveMenuItem } from '../components/MenuGrid'
import MenuGrid from '../components/MenuGrid'
import ItemCustomizeModal, { CustomizeResult } from '../components/ItemCustomizeModal'
import PriceTag from '../components/PriceTag'
import { lineUnitPrice, lineTotal, decimalToString } from '../lib/money'
import type { PaymentLineItem } from '../lib/paymentLine'
import type { OrderRecord, OrderItemRecord } from '../../../preload/index.d'

interface ResumeOrderScreenProps {
  branchId: string
  order: OrderRecord
  tableLabel: string | null
  onOrderUpdated: (order: unknown, allItems: PaymentLineItem[]) => void
  onGoToPayment: (order: unknown, allItems: PaymentLineItem[]) => void
  onBack: () => void
}

interface NewOrderLine {
  lineId: string
  productId: string
  name: string
  variantId: string | null
  variantName: string | null
  variantPriceDelta: number
  selectedModifiers: CustomizeResult['selectedModifiers']
  baseUnitPrice: number
  quantity: number
  notes: string | null
}

function describeExistingItem(
  item: OrderItemRecord,
  menuItems: EffectiveMenuItem[]
): PaymentLineItem {
  const menuItem = menuItems.find((m) => m.id === item.productId)

  const parsedModifiers = item.modifiers as {
    selections?: Array<Record<string, unknown>>
    notes?: string
  } | null

  const selections = parsedModifiers?.selections
  const variantEntry = selections?.find((s) => s.type === 'variant')

  const modifierNames = (selections ?? [])
    .filter((s) => s.type === 'modifier')
    .map((s) => String(s.name ?? ''))
    .filter(Boolean)

  return {
    lineId: item.id,
    name: menuItem?.name ?? 'Unknown item',
    variantName: variantEntry ? String(variantEntry.name ?? '') : null,
    modifierNames,
    notes: parsedModifiers?.notes ?? null,
    unitPrice: Number(item.unitPrice),
    quantity: item.quantity
  }
}

export default function ResumeOrderScreen({
  branchId,
  order,
  tableLabel,
  onOrderUpdated,
  onGoToPayment,
  onBack
}: ResumeOrderScreenProps) {
  const [menuItems, setMenuItems] = useState<EffectiveMenuItem[]>([])
  const [isLoadingMenu, setIsLoadingMenu] = useState(true)
  const [menuError, setMenuError] = useState<string | null>(null)
  const [activeItem, setActiveItem] = useState<EffectiveMenuItem | null>(null)
  const [newLines, setNewLines] = useState<NewOrderLine[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

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
        if (!cancelled) {
          setMenuError('Failed to load menu.')
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingMenu(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [branchId])

  const existingLines = useMemo(
    () => order.items.map((item) => describeExistingItem(item, menuItems)),
    [order.items, menuItems]
  )

  const handleConfirmCustomize = (result: CustomizeResult) => {
    if (!activeItem) return

    setNewLines((prev) => [
      ...prev,
      {
        lineId: crypto.randomUUID(),
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
    ])

    setActiveItem(null)
  }

  const handleRemoveNewLine = (lineId: string) => {
    setNewLines((prev) => prev.filter((l) => l.lineId !== lineId))
  }

  const handleUpdateNewLineQuantity = (lineId: string, quantity: number) => {
    setNewLines((prev) =>
      quantity <= 0
        ? prev.filter((l) => l.lineId !== lineId)
        : prev.map((l) => (l.lineId === lineId ? { ...l, quantity } : l))
    )
  }

  async function handleAddItemsAndContinue(goToPayment: boolean) {
    setSubmitError(null)

    if (newLines.length === 0) {
      if (goToPayment) {
        onGoToPayment(order, existingLines)
      } else {
        onOrderUpdated(order, existingLines)
      }

      return
    }

    setIsSubmitting(true)

    try {
      const apiItems = newLines.map((line) => {
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
              ...line.selectedModifiers.map((m) => ({
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

      const result = await window.api.orders.addItems(order.id, apiItems)

      if (!result.success || !result.order) {
        setSubmitError(result.error ?? 'Failed to add items to order.')
        return
      }

      const newDisplayLines: PaymentLineItem[] = newLines.map((line) => ({
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

      const allLines = [...existingLines, ...newDisplayLines]

      if (goToPayment) {
        onGoToPayment(result.order, allLines)
      } else {
        onOrderUpdated(result.order, allLines)
      }
    } catch {
      setSubmitError('Failed to add items. Please retry.')
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
        <div className="flex flex-col items-center">
          <div
            className="mb-4 h-9 w-9 animate-spin rounded-full border-[3px] border-t-transparent"
            style={{
              borderColor: 'var(--border)',
              borderTopColor: 'var(--accent-600)'
            }}
          />

          <p className="text-sm font-medium" style={{ color: 'var(--ink-400)' }}>
            Loading menu…
          </p>
        </div>
      </div>
    )
  }

  if (menuError) {
    return (
      <div
        className="flex h-full items-center justify-center p-8"
        style={{ background: 'var(--paper-50)' }}
      >
        <div
          className="w-full max-w-md rounded-3xl border p-8 text-center shadow-sm"
          style={{
            borderColor: 'var(--border)',
            background: 'var(--surface)'
          }}
        >
          <div
            className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl"
            style={{
              background: 'var(--amber-50)',
              color: 'var(--amber-500)'
            }}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v4" />
              <path d="M12 16h.01" />
            </svg>
          </div>

          <h2 className="text-lg font-bold" style={{ color: 'var(--ink-900)' }}>
            Unable to load menu
          </h2>

          <p className="mt-2 text-sm leading-6" style={{ color: 'var(--ink-400)' }}>
            {menuError}
          </p>

          <button
            type="button"
            onClick={onBack}
            className="mt-6 rounded-xl border-2 px-6 py-3 text-sm font-bold transition hover:opacity-80"
            style={{
              borderColor: 'var(--border)',
              color: 'var(--ink-700)'
            }}
          >
            Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0" style={{ background: 'var(--paper-50)' }}>
      <div className="min-w-0 flex-1">
        <MenuGrid items={menuItems} onSelectItem={setActiveItem} />
      </div>

      <div
        className="flex w-[400px] flex-shrink-0 flex-col border-l"
        style={{
          borderColor: 'var(--border)',
          background: 'var(--surface)'
        }}
      >
        {/* Header */}
        <div
          className="border-b px-6 py-5"
          style={{
            borderColor: 'var(--border)',
            background: 'var(--amber-50)'
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p
                className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em]"
                style={{ color: 'var(--amber-500)' }}
              >
                Open order
              </p>

              <h2
                className="text-[20px] leading-tight"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 600,
                  color: 'var(--ink-900)'
                }}
              >
                Resuming order
                {tableLabel ? ` — ${tableLabel}` : ''}
              </h2>
            </div>

            <div
              className="rounded-full px-3 py-1.5 text-[10px] font-bold"
              style={{
                background: 'var(--surface)',
                color: 'var(--amber-500)',
                border: '1px solid var(--border)'
              }}
            >
              OPEN
            </div>
          </div>

          <p className="mt-2 text-xs leading-5" style={{ color: 'var(--ink-400)' }}>
            Existing items are locked. Add more items or continue directly to payment.
          </p>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="mb-3 flex items-center justify-between">
            <h3
              className="text-[10px] font-bold uppercase tracking-[0.16em]"
              style={{ color: 'var(--ink-400)' }}
            >
              Already on this order
            </h3>

            <span className="text-[10px] font-semibold" style={{ color: 'var(--ink-400)' }}>
              {existingLines.length} item
              {existingLines.length === 1 ? '' : 's'}
            </span>
          </div>

          {existingLines.map((line) => (
            <div
              key={line.lineId}
              className="mb-3 rounded-2xl border p-4"
              style={{
                borderColor: 'var(--border)',
                background: 'var(--paper-50)'
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold" style={{ color: 'var(--ink-900)' }}>
                    {line.name}
                  </p>

                  {line.variantName && (
                    <p className="mt-0.5 text-xs" style={{ color: 'var(--ink-400)' }}>
                      {line.variantName}
                    </p>
                  )}

                  {line.modifierNames.length > 0 && (
                    <p className="mt-1 text-xs leading-4" style={{ color: 'var(--ink-400)' }}>
                      {line.modifierNames.join(', ')}
                    </p>
                  )}

                  {line.notes && (
                    <p className="mt-2 text-xs italic" style={{ color: 'var(--ink-400)' }}>
                      “{line.notes}”
                    </p>
                  )}
                </div>

                <div className="flex flex-shrink-0 flex-col items-end">
                  <span
                    className="rounded-lg px-2 py-1 text-[10px] font-bold"
                    style={{
                      background: 'var(--surface)',
                      color: 'var(--ink-600)'
                    }}
                  >
                    × {line.quantity}
                  </span>

                  <div className="mt-2">
                    <PriceTag amount={lineTotal(line.unitPrice, line.quantity)} size="sm" />
                  </div>
                </div>
              </div>
            </div>
          ))}

          {newLines.length > 0 && (
            <>
              <div className="mb-3 mt-7 flex items-center justify-between">
                <h3
                  className="text-[10px] font-bold uppercase tracking-[0.16em]"
                  style={{ color: 'var(--sage-600)' }}
                >
                  Adding now
                </h3>

                <span className="text-[10px] font-semibold" style={{ color: 'var(--sage-600)' }}>
                  Unsaved
                </span>
              </div>

              {newLines.map((line) => {
                const unitPrice = lineUnitPrice(
                  line.baseUnitPrice,
                  line.variantPriceDelta,
                  line.selectedModifiers.map((m) => m.priceDelta)
                )

                return (
                  <div
                    key={line.lineId}
                    className="mb-3 rounded-2xl border-2 p-4"
                    style={{
                      borderColor: 'var(--sage-600)',
                      background: 'var(--sage-50)'
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold" style={{ color: 'var(--ink-900)' }}>
                          {line.name}
                        </p>

                        {line.variantName && (
                          <p className="mt-0.5 text-xs" style={{ color: 'var(--ink-400)' }}>
                            {line.variantName}
                          </p>
                        )}

                        {line.selectedModifiers.length > 0 && (
                          <p className="mt-1 text-xs" style={{ color: 'var(--ink-400)' }}>
                            {line.selectedModifiers.map((m) => m.optionName).join(', ')}
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveNewLine(line.lineId)}
                        className="flex-shrink-0 rounded-lg px-2 py-1 text-[11px] font-bold transition hover:opacity-70"
                        style={{
                          color: 'var(--accent-600)',
                          background: 'var(--surface)'
                        }}
                      >
                        Remove
                      </button>
                    </div>

                    <div
                      className="mt-4 flex items-center justify-between border-t pt-3"
                      style={{
                        borderColor: 'var(--border)'
                      }}
                    >
                      <div
                        className="flex items-center rounded-xl border"
                        style={{
                          borderColor: 'var(--border)',
                          background: 'var(--surface)'
                        }}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateNewLineQuantity(line.lineId, line.quantity - 1)
                          }
                          className="flex h-8 w-8 items-center justify-center rounded-l-xl text-base font-bold"
                          style={{ color: 'var(--ink-900)' }}
                        >
                          −
                        </button>

                        <span
                          className="flex h-8 min-w-8 items-center justify-center border-x px-1 text-xs font-bold"
                          style={{
                            borderColor: 'var(--border)',
                            color: 'var(--ink-900)'
                          }}
                        >
                          {line.quantity}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateNewLineQuantity(line.lineId, line.quantity + 1)
                          }
                          className="flex h-8 w-8 items-center justify-center rounded-r-xl text-base font-bold"
                          style={{ color: 'var(--ink-900)' }}
                        >
                          +
                        </button>
                      </div>

                      <PriceTag amount={lineTotal(unitPrice, line.quantity)} size="sm" />
                    </div>
                  </div>
                )
              })}
            </>
          )}
        </div>

        {/* Footer */}
        <div
          className="border-t px-5 pb-5 pt-4"
          style={{
            borderColor: 'var(--border)',
            background: 'var(--paper-50)'
          }}
        >
          <div className="mb-4 flex items-center justify-between">
            <span className="text-xs font-semibold" style={{ color: 'var(--ink-400)' }}>
              Current order total
            </span>

            <PriceTag amount={Number(order.total)} size="md" color="accent" />
          </div>

          {submitError && (
            <div
              className="mb-3 rounded-xl border px-3 py-2.5 text-xs font-semibold"
              style={{
                borderColor: 'var(--border)',
                background: 'var(--surface)',
                color: 'var(--accent-600)'
              }}
            >
              {submitError}
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onBack}
              disabled={isSubmitting}
              className="flex-1 rounded-xl border-2 py-3 text-xs font-bold transition hover:bg-white disabled:opacity-40"
              style={{
                borderColor: 'var(--border)',
                color: 'var(--ink-600)'
              }}
            >
              Back
            </button>

            <button
              type="button"
              onClick={() => handleAddItemsAndContinue(false)}
              disabled={isSubmitting || newLines.length === 0}
              className="flex-1 rounded-xl border-2 py-3 text-xs font-bold transition disabled:opacity-40"
              style={{
                borderColor: 'var(--border)',
                color: 'var(--ink-600)',
                background: 'var(--surface)'
              }}
            >
              {isSubmitting ? 'Saving…' : 'Save & continue'}
            </button>
          </div>

          <button
            type="button"
            onClick={() => handleAddItemsAndContinue(true)}
            disabled={isSubmitting}
            className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40"
            style={{ background: 'var(--accent-600)' }}
          >
            {isSubmitting ? 'Processing…' : 'Proceed to payment'}

            {!isSubmitting && (
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M5 12h14" />
                <path d="m13 6 6 6-6 6" />
              </svg>
            )}
          </button>
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
