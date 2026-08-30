import { useEffect, useState } from 'react'
import StaffPicker, { StaffMember } from '../components/StaffPicker'
import PasswordLogin from '../components/PasswordLogin'
import PinPad from '../components/PinPad'
import TableSelectScreen, { Table } from './TableSelectScreen'
import OrderScreen from './OrderScreen'
import ResumeOrderScreen from './ResumeOrderScreen'
import PaymentScreen from './PaymentScreen'
import ReceiptScreen from './ReceiptScreen'
import type { PaymentLineItem } from '../lib/paymentLine'
import type { OrderRecord } from '../../../preload/index.d'

type LoginStage = 'picker' | 'password' | 'pin'

interface SessionUser {
  id: string
  firstName: string
  roles: string[]
}

interface ActiveOrder {
  id: string
  subtotal: string
  taxAmount: string
  total: string
}

export default function Login(): React.JSX.Element {
  const [stage, setStage] = useState<LoginStage>('picker')
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [source, setSource] = useState<'live' | 'cached'>('live')
  const [syncedAt, setSyncedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null)
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null)
  const [sessionMode, setSessionMode] = useState<'online' | 'offline'>('online')
  const [branchId, setBranchId] = useState<string | null>(null)
  const [tenantSlug, setTenantSlug] = useState<string>('')

  const [selectedTableId, setSelectedTableId] = useState<string | null | ''>(null)
  const [selectedTableLabel, setSelectedTableLabel] = useState<string | null>(null)

  const [activeOrder, setActiveOrder] = useState<ActiveOrder | null>(null)
  const [activeOrderItems, setActiveOrderItems] = useState<PaymentLineItem[]>([])
  const [paidOrder, setPaidOrder] = useState<ActiveOrder | null>(null)

  const [resumingOrder, setResumingOrder] = useState<OrderRecord | null>(null)
  const [resumeError, setResumeError] = useState<string | null>(null)

  useEffect(() => {
    loadStaff()
  }, [])

  async function loadStaff(): Promise<void> {
    setLoading(true)
    const result = await window.api.staff.getList()
    setStaff(result.staff)
    setSource(result.source)
    setSyncedAt(result.syncedAt)
    setLoading(false)
  }

  function handleSelectStaff(member: StaffMember): void {
    setSelectedStaff(member)
    if (member.hasPassword) setStage('password')
    else if (member.hasPin) setStage('pin')
  }

  function handleBack(): void {
    setSelectedStaff(null)
    setStage('picker')
  }

  async function handleLoginSuccess(user: SessionUser, mode: 'online' | 'offline'): Promise<void> {
    const config = await window.api.device.getConfig()
    setBranchId(config?.branchId ?? null)
    setTenantSlug(config?.tenantSlug ?? '')
    setSessionMode(mode)
    setSessionUser(user)
  }

  function handleLogout(): void {
    setSessionUser(null)
    setSelectedStaff(null)
    setSelectedTableId(null)
    setSelectedTableLabel(null)
    setActiveOrder(null)
    setActiveOrderItems([])
    setPaidOrder(null)
    setResumingOrder(null)
    setResumeError(null)
    setStage('picker')
  }

  function handleSelectTable(table: Table): void {
    setSelectedTableId(table.id)
    setSelectedTableLabel(table.label)
  }

  function handleSkipTable(): void {
    setSelectedTableId('')
    setSelectedTableLabel(null)
  }

  function handleBackToTables(): void {
    setSelectedTableId(null)
    setSelectedTableLabel(null)
  }

  async function handleResumeTable(table: Table): Promise<void> {
    if (!branchId) return
    setResumeError(null)
    const result = await window.api.orders.getOpenForTable(branchId, table.id)
    if (!result.success || !result.order) {
      setResumeError(result.error ?? 'Could not find an open order for this table.')
      return
    }
    setSelectedTableId(table.id)
    setSelectedTableLabel(table.label)
    setResumingOrder(result.order)
  }

  function handleResumeContinueOrdering(order: unknown): void {
    setResumingOrder(order as OrderRecord)
  }

  function handleResumeGoToPayment(order: unknown, allLines: PaymentLineItem[]): void {
    setResumingOrder(null)
    setActiveOrder(order as ActiveOrder)
    setActiveOrderItems(allLines)
  }

  function handleResumeBack(): void {
    setResumingOrder(null)
    setSelectedTableId(null)
    setSelectedTableLabel(null)
  }

  function handleOrderCreated(order: unknown, submittedItems: PaymentLineItem[]): void {
    setActiveOrder(order as ActiveOrder)
    setActiveOrderItems(submittedItems)
  }

  function handlePaymentComplete(): void {
    setPaidOrder(activeOrder)
    setActiveOrder(null)
  }

  function handlePaymentCancel(): void {
    setActiveOrder(null)
    setActiveOrderItems([])
    setSelectedTableId(null)
    setSelectedTableLabel(null)
  }

  function handleReceiptDone(): void {
    setPaidOrder(null)
    setActiveOrderItems([])
    setSelectedTableId(null)
    setSelectedTableLabel(null)
  }

  if (sessionUser) {
    if (!branchId) {
      return (
        <div
          className="flex h-full items-center justify-center"
          style={{ background: 'var(--paper-50)' }}
        >
          <div
            className="max-w-sm rounded-3xl border-2 p-8 text-center"
            style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
          >
            <h1
              className="text-xl"
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 600,
                color: 'var(--ink-900)'
              }}
            >
              Device not fully configured
            </h1>
            <p className="mt-2 text-sm" style={{ color: 'var(--ink-400)' }}>
              No branch is set for this device. Contact your administrator.
            </p>
            <button
              onClick={handleLogout}
              className="mt-6 w-full rounded-full py-3 text-sm font-bold text-white"
              style={{ background: 'var(--ink-900)' }}
            >
              Log out
            </button>
          </div>
        </div>
      )
    }

    if (paidOrder) {
      return (
        <ReceiptScreen
          order={paidOrder}
          submittedItems={activeOrderItems}
          tenantSlug={tenantSlug}
          tableLabel={selectedTableLabel}
          onDone={handleReceiptDone}
        />
      )
    }

    if (activeOrder) {
      return (
        <PaymentScreen
          order={activeOrder}
          submittedItems={activeOrderItems}
          onPaymentComplete={handlePaymentComplete}
          onCancel={handlePaymentCancel}
        />
      )
    }

    if (selectedTableId === null) {
      return (
        <TableSelectScreen
          branchId={branchId}
          onSelectTable={handleSelectTable}
          onResumeTable={handleResumeTable}
          onSkip={handleSkipTable}
          onLogout={handleLogout}
        />
      )
    }

    if (resumeError) {
      return (
        <div
          className="flex h-full items-center justify-center"
          style={{ background: 'var(--paper-50)' }}
        >
          <div
            className="max-w-sm rounded-3xl border-2 p-8 text-center"
            style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
          >
            <p className="text-sm font-medium" style={{ color: 'var(--accent-600)' }}>
              {resumeError}
            </p>
            <button
              onClick={() => {
                setResumeError(null)
                setSelectedTableId(null)
                setSelectedTableLabel(null)
              }}
              className="mt-6 w-full rounded-full border-2 py-3 text-sm font-semibold"
              style={{ borderColor: 'var(--border)', color: 'var(--ink-600)' }}
            >
              Back to tables
            </button>
          </div>
        </div>
      )
    }

    if (resumingOrder) {
      return (
        <ResumeOrderScreen
          branchId={branchId}
          order={resumingOrder}
          tableLabel={selectedTableLabel}
          onOrderUpdated={handleResumeContinueOrdering}
          onGoToPayment={handleResumeGoToPayment}
          onBack={handleResumeBack}
        />
      )
    }

    return (
      <OrderScreen
        branchId={branchId}
        tableId={selectedTableId === '' ? null : selectedTableId}
        sessionMode={sessionMode}
        taxRatePercent={0}
        onOrderCreated={handleOrderCreated}
        onLogout={handleLogout}
        onBackToTables={handleBackToTables}
      />
    )
  }

  if (loading) {
    return (
      <div
        className="flex h-full items-center justify-center"
        style={{ background: 'var(--paper-50)' }}
      >
        <p style={{ color: 'var(--ink-400)' }}>Loading staff…</p>
      </div>
    )
  }

  return (
    <div className="h-full" style={{ background: 'var(--paper-50)' }}>
      {source === 'cached' && (
        <div
          className="px-6 py-3 text-center text-sm font-medium"
          style={{ background: 'var(--amber-50)', color: 'var(--amber-500)' }}
        >
          Offline — showing last saved staff list
          {syncedAt ? ` (synced ${new Date(syncedAt).toLocaleString()})` : ''}
        </div>
      )}
      {stage === 'picker' && (
        <StaffPicker staff={staff} onSelect={handleSelectStaff} onRefresh={loadStaff} />
      )}
      {stage === 'password' && selectedStaff && (
        <PasswordLogin
          staffName={`${selectedStaff.firstName} ${selectedStaff.lastName}`}
          onBack={handleBack}
          onSuccess={handleLoginSuccess}
        />
      )}
      {stage === 'pin' && selectedStaff && (
        <PinPad
          staffId={selectedStaff.id}
          staffName={`${selectedStaff.firstName} ${selectedStaff.lastName}`}
          onBack={handleBack}
          onSuccess={handleLoginSuccess}
        />
      )}
    </div>
  )
}
