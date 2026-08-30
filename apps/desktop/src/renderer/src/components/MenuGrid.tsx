import { useMemo, useState } from 'react'
import PriceTag from './PriceTag'

export interface EffectiveMenuItemVariant {
  id: string
  name: string
  priceDelta: number
  isDefault: boolean
}

export interface EffectiveMenuItemModifierOption {
  id: string
  name: string
  priceDelta: number
}

export interface EffectiveMenuItemModifierGroup {
  id: string
  name: string
  minSelect: number
  maxSelect: number
  isRequired: boolean
  options: EffectiveMenuItemModifierOption[]
}

export interface EffectiveMenuItem {
  id: string
  name: string
  description: string | null
  categoryId: string
  categoryName: string
  effectivePrice: number
  isAvailable: boolean
  isVegetarian: boolean
  imageUrl: string | null
  variants: EffectiveMenuItemVariant[]
  modifierGroups: EffectiveMenuItemModifierGroup[]
}

export interface MenuGridProps {
  items: EffectiveMenuItem[]
  onSelectItem: (item: EffectiveMenuItem) => void
}

export default function MenuGrid({ items, onSelectItem }: MenuGridProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const categories = useMemo(() => {
    const map = new Map<string, string>()
    for (const item of items) {
      if (!map.has(item.categoryId)) map.set(item.categoryId, item.categoryName)
    }
    return Array.from(map.entries())
  }, [items])

  const visibleItems = useMemo(() => {
    let result = items
    if (activeCategory) result = result.filter((item) => item.categoryId === activeCategory)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter((item) => item.name.toLowerCase().includes(q))
    }
    return result
  }, [items, activeCategory, search])

  return (
    <div className="menu-workspace" style={{ height: '100%' }}>
      <div className="menu-toolbar">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search menu…"
          className="menu-search"
        />
        <div className="category-row">
          <button
            type="button"
            onClick={() => setActiveCategory(null)}
            className={`category-button${activeCategory === null ? ' active' : ''}`}
          >
            All
          </button>
          {categories.map(([id, name]) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveCategory(id)}
              className={`category-button${activeCategory === id ? ' active' : ''}`}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      <div className="menu-grid">
        {visibleItems.map((item) => (
          <button
            key={item.id}
            type="button"
            disabled={!item.isAvailable}
            onClick={() => onSelectItem(item)}
            className={`menu-card${!item.isAvailable ? ' unavailable' : ''}`}
          >
            {item.imageUrl ? (
              <img src={item.imageUrl} alt={item.name} className="menu-image" />
            ) : (
              <div className="menu-image-placeholder">🍽</div>
            )}
            <div className="menu-card-content">
              <div className="menu-card-top">
                <span className="menu-card-name">{item.name}</span>
                <span className={`food-marker${item.isVegetarian ? '' : ' nonveg'}`} />
              </div>
              <div className="menu-price">
                <PriceTag amount={item.effectivePrice} size="md" color="accent" />
              </div>
              {!item.isAvailable && <p className="menu-meta">UNAVAILABLE</p>}
            </div>
          </button>
        ))}

        {visibleItems.length === 0 && (
          <div
            style={{
              gridColumn: '1 / -1',
              textAlign: 'center',
              padding: '40px',
              color: 'var(--ink-400)'
            }}
          >
            No items in this category.
          </div>
        )}
      </div>
    </div>
  )
}
