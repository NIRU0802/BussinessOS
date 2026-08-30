import { splitCurrencyDisplay } from '../lib/money'

interface PriceTagProps {
  amount: number
  size?: 'sm' | 'md' | 'lg' | 'xl'
  color?: 'ink' | 'accent' | 'sage' | 'muted'
}

const SIZE_PX: Record<NonNullable<PriceTagProps['size']>, string> = {
  sm: '13px',
  md: '17px',
  lg: '25px',
  xl: '38px'
}

const COLOR_VAR: Record<NonNullable<PriceTagProps['color']>, string> = {
  ink: 'var(--ink-900)',
  accent: 'var(--accent-600)',
  sage: 'var(--sage-600)',
  muted: 'var(--ink-400)'
}

export default function PriceTag({ amount, size = 'md', color = 'ink' }: PriceTagProps) {
  const { symbol, amount: value } = splitCurrencyDisplay(amount)
  return (
    <span className="price-display" style={{ fontSize: SIZE_PX[size], color: COLOR_VAR[color] }}>
      <span className="currency-symbol">{symbol}</span>
      {value}
    </span>
  )
}
