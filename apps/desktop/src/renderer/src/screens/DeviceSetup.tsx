import { useState } from 'react'

interface Props {
  onComplete: () => void
}

export default function DeviceSetup({ onComplete }: Props): React.JSX.Element {
  const [tenantSlug, setTenantSlug] = useState('')
  const [tenantId, setTenantId] = useState('')
  const [branchId, setBranchId] = useState('')
  const [apiBaseUrl, setApiBaseUrl] = useState('http://localhost:3001')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setError(null)

    if (!tenantSlug.trim() || !tenantId.trim() || !branchId.trim() || !apiBaseUrl.trim()) {
      setError('All fields are required.')
      return
    }

    setSaving(true)
    try {
      await window.api.device.setConfig({
        tenantSlug: tenantSlug.trim(),
        tenantId: tenantId.trim(),
        branchId: branchId.trim(),
        apiBaseUrl: apiBaseUrl.trim().replace(/\/$/, '')
      })
      onComplete()
    } catch (err) {
      setError('Failed to save device setup. Please try again.')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="setup-layout">
      <div className="setup-card">
        <div className="setup-brand">
          <span className="setup-brand-mark">B</span>
          Business OS
        </div>

        <h1 className="auth-heading" style={{ margin: 0 }}>
          Device setup
        </h1>
        <p className="auth-description">
          This is a one-time setup for this terminal. It will not be asked again.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="setup-grid">
            <label className="form-label full">
              <span>Restaurant (tenant slug)</span>
              <input
                type="text"
                value={tenantSlug}
                onChange={(e) => setTenantSlug(e.target.value)}
                placeholder="spice-garden-a1b2c3"
                className="form-field"
              />
            </label>

            <label className="form-label">
              <span>Tenant ID</span>
              <input
                type="text"
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                placeholder="e6a92167-..."
                className="form-field"
              />
            </label>

            <label className="form-label">
              <span>Branch ID</span>
              <input
                type="text"
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                placeholder="5a6accb4-..."
                className="form-field"
              />
            </label>

            <label className="form-label full">
              <span>API server URL</span>
              <input
                type="text"
                value={apiBaseUrl}
                onChange={(e) => setApiBaseUrl(e.target.value)}
                placeholder="http://localhost:3001"
                className="form-field"
              />
            </label>
          </div>

          {error && <div className="error-text">{error}</div>}

          <button type="submit" disabled={saving} className="setup-submit">
            {saving ? 'Saving…' : 'Complete setup'}
          </button>
        </form>
      </div>
    </div>
  )
}
