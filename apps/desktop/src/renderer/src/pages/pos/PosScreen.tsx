import { useEffect, useState } from 'react'
import { CartProvider } from '../../state/CartContext'
import { MenuBrowser } from './MenuBrowser'
import CartPanel from './CartPanel'
import { CheckoutModal } from './CheckoutModal'

export function PosScreen() {
  const [branchId, setBranchId] = useState<string | null>(null)
  const [deviceId, setDeviceId] = useState<string | null>(null)
  const [configError, setConfigError] = useState<string | null>(null)
  const [checkoutOpen, setCheckoutOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function loadDeviceInfo() {
      const [config, id] = await Promise.all([
        window.api.device.getConfig(),
        window.api.device.getDeviceId()
      ])
      if (cancelled) return
      if (!config) {
        setConfigError('Device is not set up. Contact your administrator.')
        return
      }
      setBranchId(config.branchId)
      setDeviceId(id)
    }
    loadDeviceInfo()
    return () => {
      cancelled = true
    }
  }, [])

  if (configError) {
    return (
      <div
        className="flex h-full items-center justify-center"
        style={{ background: 'var(--paper-50)' }}
      >
        <p className="text-sm font-medium" style={{ color: 'var(--accent-600)' }}>
          {configError}
        </p>
      </div>
    )
  }

  if (!branchId || !deviceId) {
    return (
      <div
        className="flex h-full items-center justify-center"
        style={{ background: 'var(--paper-50)' }}
      >
        <p className="text-sm font-medium" style={{ color: 'var(--ink-400)' }}>
          Loading device configuration…
        </p>
      </div>
    )
  }

  return (
    <CartProvider>
      <div className="grid h-full" style={{ gridTemplateColumns: 'minmax(0, 1fr) 390px' }}>
        <div className="min-w-0">
          <MenuBrowser branchId={branchId} />
        </div>
        <CartPanel onCheckout={() => setCheckoutOpen(true)} />
      </div>

      {checkoutOpen && (
        <CheckoutModal
          branchId={branchId}
          deviceId={deviceId}
          onClose={() => setCheckoutOpen(false)}
          onOrderPlaced={() => setCheckoutOpen(false)}
        />
      )}
    </CartProvider>
  )
}
