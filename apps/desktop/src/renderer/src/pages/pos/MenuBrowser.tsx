import { useEffect, useMemo, useState } from 'react'
import type { MenuCategory, MenuItem } from '../../types/pos'
import { useCart } from '../../state/CartContext'
import PriceTag from '../../components/PriceTag'

interface MenuBrowserProps {
  branchId: string
}

// Normalizes whatever the raw API response looks like into MenuCategory[].
// Handles two likely shapes defensively:
//   1. Already grouped: [{ id, name, items: [...] }, ...]
//   2. Flat list of items each carrying categoryId/categoryName
function normalizeMenu(raw: unknown): MenuCategory[] {
  if (!Array.isArray(raw)) return []

  const looksGrouped = raw.length > 0 && raw[0] && Array.isArray((raw[0] as any).items)
  if (looksGrouped) {
    return raw as MenuCategory[]
  }

  const byCategory = new Map<string, MenuCategory>()
  for (const rawItem of raw as any[]) {
    const item: MenuItem = {
      id: rawItem.id,
      name: rawItem.name,
      price: rawItem.price ?? '0',
      categoryId: rawItem.categoryId ?? 'uncategorized',
      categoryName: rawItem.categoryName ?? rawItem.category?.name ?? 'Other',
      description: rawItem.description,
      imageUrl: rawItem.imageUrl,
      isAvailable: rawItem.isAvailable ?? true,
      modifiers: rawItem.modifiers ?? []
    }
    const existing = byCategory.get(item.categoryId)
    if (existing) {
      existing.items.push(item)
    } else {
      byCategory.set(item.categoryId, {
        id: item.categoryId,
        name: item.categoryName,
        items: [item]
      })
    }
  }
  return Array.from(byCategory.values())
}

export function MenuBrowser({ branchId }: MenuBrowserProps) {
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { addItem } = useCart()

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      const result = await window.api.menu.getEffective(branchId)
      if (cancelled) return
      if (!result.success) {
        setError(result.error ?? 'Failed to load menu.')
        setLoading(false)
        return
      }
      const normalized = normalizeMenu(result.items)
      setCategories(normalized)
      setActiveCategoryId(normalized[0]?.id ?? null)
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [branchId])

  const activeCategory = useMemo(
    () => categories.find((c) => c.id === activeCategoryId) ?? categories[0],
    [categories, activeCategoryId]
  )

  const visibleItems = useMemo(() => {
    const items = activeCategory?.items ?? []
    if (!query.trim()) return items
    const q = query.trim().toLowerCase()
    return items.filter((item) => item.name.toLowerCase().includes(q))
  }, [activeCategory, query])

  if (loading) {
    return (
      <div
        className="flex h-full items-center justify-center"
        style={{ background: 'var(--paper-50)' }}
      >
        <p className="text-sm font-medium" style={{ color: 'var(--ink-400)' }}>
          Loading menu…
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div
        className="flex h-full items-center justify-center"
        style={{ background: 'var(--paper-50)' }}
      >
        <p className="text-sm font-medium" style={{ color: 'var(--accent-600)' }}>
          {error}
        </p>
      </div>
    )
  }

  if (categories.length === 0) {
    return (
      <div
        className="flex h-full items-center justify-center"
        style={{ background: 'var(--paper-50)' }}
      >
        <p className="text-sm" style={{ color: 'var(--ink-400)' }}>
          No menu items available.
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col" style={{ background: 'var(--paper-50)' }}>
      {/* Toolbar */}
      <div
        className="flex-shrink-0 border-b px-6 py-4"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search menu…"
          className="mb-3 w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition"
          style={{
            borderColor: 'var(--border)',
            background: 'var(--surface-2)',
            color: 'var(--ink-900)'
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--accent-600)'
            e.currentTarget.style.background = '#fff'
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--border)'
            e.currentTarget.style.background = 'var(--surface-2)'
          }}
        />

        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {categories.map((cat) => {
            const active = cat.id === activeCategory?.id
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategoryId(cat.id)}
                className="whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold transition"
                style={
                  active
                    ? { background: 'var(--ink-900)', color: '#fff' }
                    : {
                        background: 'var(--surface)',
                        color: 'var(--ink-600)',
                        border: '1px solid var(--border)'
                      }
                }
              >
                {cat.name}
              </button>
            )
          })}
        </div>
      </div>

      {/* Item grid */}
      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4">
          {visibleItems.map((item) => {
            const unavailable = item.isAvailable === false
            const price = typeof item.price === 'number' ? item.price : Number(item.price)

            return (
              <button
                key={item.id}
                type="button"
                disabled={unavailable}
                onClick={() => addItem(item)}
                className="flex flex-col items-start overflow-hidden rounded-2xl border text-left transition"
                style={{
                  borderColor: 'var(--border)',
                  background: 'var(--surface)',
                  opacity: unavailable ? 0.45 : 1,
                  cursor: unavailable ? 'not-allowed' : 'pointer',
                  boxShadow: 'var(--shadow-sm)'
                }}
                onMouseEnter={(e) => {
                  if (!unavailable) {
                    e.currentTarget.style.borderColor = '#c9c3b9'
                    e.currentTarget.style.boxShadow = 'var(--shadow-md)'
                    e.currentTarget.style.transform = 'translateY(-1px)'
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)'
                  e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt=""
                    className="h-20 w-full object-cover"
                    style={{ background: '#ebe8e1' }}
                  />
                ) : (
                  <div
                    className="flex h-20 w-full items-center justify-center text-xl"
                    style={{
                      background: 'linear-gradient(135deg, #ece9e2, #f8f6f1)',
                      color: '#aaa69d'
                    }}
                  >
                    🍽️
                  </div>
                )}

                <div className="w-full px-4 py-3.5">
                  <p
                    className="truncate text-base leading-snug"
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontWeight: 600,
                      color: 'var(--ink-900)'
                    }}
                  >
                    {item.name}
                  </p>

                  <div className="mt-2">
                    <PriceTag amount={price} size="md" color="accent" />
                  </div>

                  {unavailable && (
                    <span
                      className="mt-1.5 block text-[11px] font-semibold"
                      style={{ color: 'var(--accent-600)' }}
                    >
                      Unavailable
                    </span>
                  )}
                </div>
              </button>
            )
          })}

          {visibleItems.length === 0 && (
            <div className="col-span-full flex min-h-40 items-center justify-center">
              <p className="text-sm" style={{ color: 'var(--ink-400)' }}>
                No items found.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
