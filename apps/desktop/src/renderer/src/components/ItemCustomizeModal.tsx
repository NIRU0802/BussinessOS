import { useMemo, useState } from 'react'
import PriceTag from './PriceTag'
import { lineUnitPrice } from '../lib/money'
import type { EffectiveMenuItem } from './MenuGrid'

export interface SelectedModifierOption {
  groupId: string
  groupName: string
  optionId: string
  optionName: string
  priceDelta: number
}

export interface CustomizeResult {
  variant: EffectiveMenuItem['variants'][number] | null
  selectedModifiers: SelectedModifierOption[]
  quantity: number
  notes: string | null
}

interface ItemCustomizeModalProps {
  item: EffectiveMenuItem
  onConfirm: (result: CustomizeResult) => void
  onClose: () => void
}

export default function ItemCustomizeModal({ item, onConfirm, onClose }: ItemCustomizeModalProps) {
  const [variant, setVariant] = useState(
    item.variants.find((v) => v.isDefault) ?? item.variants[0] ?? null
  )
  const [selections, setSelections] = useState<Record<string, string[]>>({})
  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState('')

  const toggleOption = (group: EffectiveMenuItem['modifierGroups'][number], optionId: string) => {
    setSelections((prev) => {
      const current = prev[group.id] ?? []
      const isSelected = current.includes(optionId)
      let next: string[]

      if (isSelected) {
        next = current.filter((id) => id !== optionId)
      } else if (group.maxSelect === 1) {
        next = [optionId]
      } else if (current.length >= group.maxSelect) {
        return prev
      } else {
        next = [...current, optionId]
      }
      return { ...prev, [group.id]: next }
    })
  }

  const selectedModifiers: SelectedModifierOption[] = useMemo(() => {
    const result: SelectedModifierOption[] = []
    for (const group of item.modifierGroups) {
      const chosenIds = selections[group.id] ?? []
      for (const optId of chosenIds) {
        const opt = group.options.find((o) => o.id === optId)
        if (!opt) continue
        result.push({
          groupId: group.id,
          groupName: group.name,
          optionId: opt.id,
          optionName: opt.name,
          priceDelta: opt.priceDelta
        })
      }
    }
    return result
  }, [selections, item.modifierGroups])

  const missingRequired = item.modifierGroups.filter(
    (g) => g.isRequired && (selections[g.id]?.length ?? 0) < g.minSelect
  )

  const unitPrice = lineUnitPrice(
    item.effectivePrice,
    variant?.priceDelta ?? 0,
    selectedModifiers.map((m) => m.priceDelta)
  )

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="modal-header">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={item.name} className="modal-item-image" />
          ) : (
            <div className="modal-item-image-placeholder">🍽</div>
          )}
          <h2 className="modal-title">{item.name}</h2>
          {item.description && <p className="modal-description">{item.description}</p>}
        </div>

        <div className="modal-body">
          {item.variants.length > 0 && (
            <div className="modal-section">
              <p className="modal-section-title">Size</p>
              <div className="choice-row">
                {item.variants.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setVariant(v)}
                    className={`choice-button${variant?.id === v.id ? ' selected' : ''}`}
                  >
                    {v.name}
                    {v.priceDelta !== 0 && ` (${v.priceDelta > 0 ? '+' : ''}₹${v.priceDelta})`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {item.modifierGroups.map((group) => (
            <div key={group.id} className="modal-section">
              <p className="modal-section-title">
                {group.name}
                {group.isRequired && <span style={{ color: 'var(--accent-600)' }}> *</span>}
                {'  '}
                <span style={{ textTransform: 'none', fontWeight: 500, color: 'var(--ink-400)' }}>
                  {group.maxSelect === 1 ? 'choose 1' : `choose up to ${group.maxSelect}`}
                </span>
              </p>
              <div className="choice-row">
                {group.options.map((opt) => {
                  const isSelected = (selections[group.id] ?? []).includes(opt.id)
                  return (
                    <button
                      key={opt.id}
                      onClick={() => toggleOption(group, opt.id)}
                      className={`choice-button${isSelected ? ' selected' : ''}`}
                    >
                      {opt.name}
                      {opt.priceDelta !== 0 && ` (+₹${opt.priceDelta})`}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}

          <div className="modal-section">
            <p className="modal-section-title">Notes</p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. less spicy, no onion"
              className="form-field"
              rows={2}
            />
          </div>

          <div className="modal-section" style={{ marginBottom: 0 }}>
            <div className="cart-line-actions">
              <p className="modal-section-title" style={{ marginBottom: 0 }}>
                Quantity
              </p>
              <div className="qty-control">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="qty-button"
                >
                  −
                </button>
                <span className="qty-value">{quantity}</span>
                <button onClick={() => setQuantity((q) => q + 1)} className="qty-button">
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="ui-button">
            Cancel
          </button>
          <button
            disabled={missingRequired.length > 0}
            onClick={() =>
              onConfirm({ variant, selectedModifiers, quantity, notes: notes.trim() || null })
            }
            className="ui-button primary primary-wide"
          >
            Add {quantity} · <PriceTag amount={unitPrice * quantity} size="sm" color="ink" />
          </button>
        </div>
      </div>
    </div>
  )
}
