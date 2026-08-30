import { createContext, useCallback, useContext, useMemo, useReducer } from 'react'
import type { CartLine, CartLineModifier, CartTotals, MenuItem } from '../types/pos'

interface CartState {
  lines: CartLine[]
}

type CartAction =
  | { type: 'ADD_ITEM'; item: MenuItem; modifiers: CartLineModifier[]; notes?: string }
  | { type: 'INCREMENT'; lineId: string }
  | { type: 'DECREMENT'; lineId: string }
  | { type: 'REMOVE'; lineId: string }
  | { type: 'SET_QUANTITY'; lineId: string; quantity: number }
  | { type: 'CLEAR' }

function toNumber(value: string | number): number {
  const n = typeof value === 'number' ? value : parseFloat(value)
  return Number.isFinite(n) ? n : 0
}

// Two lines are "the same" (and can be merged/incremented together) only if
// the product AND the exact modifier selection match. Different modifier
// choices on the same product must stay as separate lines.
function lineSignature(productId: string, modifiers: CartLineModifier[]): string {
  const modKey = [...modifiers]
    .map((m) => `${m.groupId}:${m.optionId}`)
    .sort()
    .join('|')
  return `${productId}::${modKey}`
}

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const unitPrice = toNumber(action.item.price)
      const signature = lineSignature(action.item.id, action.modifiers)
      const existing = state.lines.find(
        (l) => lineSignature(l.productId, l.modifiers) === signature && !action.notes
      )
      if (existing) {
        return {
          lines: state.lines.map((l) =>
            l.lineId === existing.lineId ? { ...l, quantity: l.quantity + 1 } : l
          )
        }
      }
      const newLine: CartLine = {
        lineId: crypto.randomUUID(),
        productId: action.item.id,
        name: action.item.name,
        unitPrice,
        quantity: 1,
        modifiers: action.modifiers,
        notes: action.notes
      }
      return { lines: [...state.lines, newLine] }
    }
    case 'INCREMENT':
      return {
        lines: state.lines.map((l) =>
          l.lineId === action.lineId ? { ...l, quantity: l.quantity + 1 } : l
        )
      }
    case 'DECREMENT':
      return {
        lines: state.lines
          .map((l) => (l.lineId === action.lineId ? { ...l, quantity: l.quantity - 1 } : l))
          .filter((l) => l.quantity > 0)
      }
    case 'SET_QUANTITY':
      return {
        lines: state.lines
          .map((l) =>
            l.lineId === action.lineId ? { ...l, quantity: Math.max(0, action.quantity) } : l
          )
          .filter((l) => l.quantity > 0)
      }
    case 'REMOVE':
      return { lines: state.lines.filter((l) => l.lineId !== action.lineId) }
    case 'CLEAR':
      return { lines: [] }
    default:
      return state
  }
}

function lineTotal(line: CartLine): number {
  const modTotal = line.modifiers.reduce((sum, m) => sum + toNumber(m.priceDelta), 0)
  return (line.unitPrice + modTotal) * line.quantity
}

export function computeTotals(lines: CartLine[]): CartTotals {
  const subtotal = lines.reduce((sum, l) => sum + lineTotal(l), 0)
  // NOTE: no tax engine wiring available yet. Tax is left at 0 until a
  // client-callable rate/breakdown endpoint is confirmed and wired up —
  // do not ship this to production as-is.
  const taxAmount = 0
  const total = subtotal + taxAmount
  return { subtotal, taxAmount, total }
}

interface CartContextValue {
  lines: CartLine[]
  totals: CartTotals
  addItem: (item: MenuItem, modifiers?: CartLineModifier[], notes?: string) => void
  increment: (lineId: string) => void
  decrement: (lineId: string) => void
  setQuantity: (lineId: string, quantity: number) => void
  removeLine: (lineId: string) => void
  clear: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { lines: [] })

  const addItem = useCallback(
    (item: MenuItem, modifiers: CartLineModifier[] = [], notes?: string) =>
      dispatch({ type: 'ADD_ITEM', item, modifiers, notes }),
    []
  )
  const increment = useCallback((lineId: string) => dispatch({ type: 'INCREMENT', lineId }), [])
  const decrement = useCallback((lineId: string) => dispatch({ type: 'DECREMENT', lineId }), [])
  const setQuantity = useCallback(
    (lineId: string, quantity: number) => dispatch({ type: 'SET_QUANTITY', lineId, quantity }),
    []
  )
  const removeLine = useCallback((lineId: string) => dispatch({ type: 'REMOVE', lineId }), [])
  const clear = useCallback(() => dispatch({ type: 'CLEAR' }), [])

  const totals = useMemo(() => computeTotals(state.lines), [state.lines])

  const value = useMemo(
    () => ({
      lines: state.lines,
      totals,
      addItem,
      increment,
      decrement,
      setQuantity,
      removeLine,
      clear
    }),
    [state.lines, totals, addItem, increment, decrement, setQuantity, removeLine, clear]
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within a CartProvider')
  return ctx
}
