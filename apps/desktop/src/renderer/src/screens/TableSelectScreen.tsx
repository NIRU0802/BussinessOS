import { useEffect, useState } from 'react'

export interface Table {
  id: string
  label: string
  capacity: number
  status: 'available' | 'occupied' | 'preparing' | 'bill_requested' | 'paid'
  mergedIntoTableId: string | null
}

interface TableSelectScreenProps {
  branchId: string
  onSelectTable: (table: Table) => void
  onResumeTable: (table: Table) => void
  onSkip: () => void
  onLogout: () => void
}

const RESUMABLE_STATUSES: Table['status'][] = ['occupied', 'preparing', 'bill_requested']

const STATUS_CONFIG: Record<Table['status'], { label: string; dot: string }> = {
  available: { label: 'Available', dot: 'var(--sage-600)' },
  occupied: { label: 'Occupied', dot: 'var(--amber-500)' },
  preparing: { label: 'Preparing', dot: 'var(--amber-500)' },
  bill_requested: { label: 'Bill requested', dot: 'var(--accent-600)' },
  paid: { label: 'Paid', dot: 'var(--ink-400)' }
}

export default function TableSelectScreen({
  branchId,
  onSelectTable,
  onResumeTable,
  onSkip,
  onLogout
}: TableSelectScreenProps) {
  const [tables, setTables] = useState<Table[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    window.api.tables
      .getForBranch(branchId)
      .then((result) => {
        if (cancelled) return
        if (!result.success) {
          setError(result.error ?? 'Failed to load tables.')
          return
        }
        setTables(((result.tables ?? []) as Table[]).filter((t) => !t.mergedIntoTableId))
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load tables.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [branchId])

  function handleTableClick(table: Table): void {
    if (table.status === 'available') {
      onSelectTable(table)
    } else if (RESUMABLE_STATUSES.includes(table.status)) {
      onResumeTable(table)
    }
  }

  return (
    <div className="pos-shell-single">
      <div className="pos-topbar">
        <div>
          <div className="pos-title">Select a table</div>
          <div className="pos-subtitle">
            Tap an available table to start, or resume one already in progress
          </div>
        </div>
        <div className="pos-top-actions">
          <button onClick={onSkip} className="ui-button dark">
            Takeaway / Counter order
          </button>
          <button onClick={onLogout} className="ui-button">
            Log out
          </button>
        </div>
      </div>

      <div className="desktop-page" style={{ flex: 1 }}>
        {loading && (
          <div className="flex h-full items-center justify-center">
            <p style={{ color: 'var(--ink-400)' }}>Loading tables…</p>
          </div>
        )}

        {!loading && error && (
          <div className="flex h-full flex-col items-center justify-center gap-4">
            <p style={{ color: 'var(--ink-600)' }}>{error}</p>
            <button onClick={onSkip} className="ui-button dark">
              Continue without a table
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="table-grid">
              {tables.map((table) => {
                const clickable =
                  table.status === 'available' || RESUMABLE_STATUSES.includes(table.status)
                const config = STATUS_CONFIG[table.status]
                return (
                  <button
                    key={table.id}
                    disabled={!clickable}
                    onClick={() => handleTableClick(table)}
                    className={`table-card${!clickable ? ' disabled' : ''}`}
                  >
                    <div className="table-top">
                      <span className="table-number">{table.label}</span>
                      <span className="table-status-dot" style={{ background: config.dot }} />
                    </div>
                    <p className="table-capacity">Seats {table.capacity}</p>
                    <p className="table-status" style={{ color: 'var(--ink-600)' }}>
                      {config.label}
                    </p>
                    {RESUMABLE_STATUSES.includes(table.status) && (
                      <span className="table-resume">Tap to resume</span>
                    )}
                  </button>
                )
              })}
            </div>

            {tables.length === 0 && (
              <div className="flex h-full items-center justify-center">
                <p style={{ color: 'var(--ink-400)' }}>No tables configured for this branch.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
