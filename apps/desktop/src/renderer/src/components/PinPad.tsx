import { useState } from 'react'

interface Props {
  staffId: string
  staffName: string
  onBack: () => void
  onSuccess: (
    user: { id: string; firstName: string; roles: string[] },
    mode: 'online' | 'offline'
  ) => void
}

const PIN_LENGTH = 4

export default function PinPad({
  staffId,
  staffName,
  onBack,
  onSuccess
}: Props): React.JSX.Element {
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [offlineNotice, setOfflineNotice] = useState(false)

  async function submitPin(fullPin: string): Promise<void> {
    setLoading(true)
    setError(null)
    const result = await window.api.auth.quickLogin(staffId, fullPin)
    setLoading(false)
    setPin('')
    if (!result.success || !result.user) {
      setError(result.error ?? 'Login failed.')
      return
    }
    if (result.mode === 'offline') setOfflineNotice(true)
    onSuccess(
      { id: result.user.id, firstName: result.user.firstName, roles: result.user.roles },
      result.mode ?? 'offline'
    )
  }

  function handleDigit(digit: string): void {
    if (loading) return
    const next = pin + digit
    setPin(next)
    if (next.length === PIN_LENGTH) submitPin(next)
  }

  function handleClear(): void {
    setPin('')
    setError(null)
  }

  return (
    <div className="auth-page">
      <div className="auth-brand-panel">
        <div className="auth-logo">
          <span className="auth-logo-mark">B</span>
          Business OS
        </div>

        <div>
          <h1 className="auth-brand-title">Fast, secure staff sign-in.</h1>
          <p className="auth-brand-copy">
            Your 4-digit PIN keeps the counter moving fast, with a full offline fallback so service
            never stops.
          </p>
        </div>

        <div className="auth-stat-row">
          <div className="auth-stat">
            <strong>4-digit</strong>
            <span>PIN sign-in</span>
          </div>
          <div className="auth-stat">
            <strong>Offline-ready</strong>
            <span>Never blocks service</span>
          </div>
        </div>
      </div>

      <div className="auth-content">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div style={{ textAlign: 'left' }}>
            <button type="button" onClick={onBack} className="auth-back">
              ← Back
            </button>
          </div>

          <p className="auth-eyebrow">Staff sign-in</p>
          <h2 className="auth-heading">{staffName}</h2>
          <p className="auth-description">Enter your PIN</p>

          <div className="pin-dots">
            {Array.from({ length: PIN_LENGTH }).map((_, i) => (
              <div key={i} className={`pin-dot${i < pin.length ? ' filled' : ''}`} />
            ))}
          </div>

          {error && (
            <div className="error-text" style={{ textAlign: 'center' }}>
              {error}
            </div>
          )}
          {offlineNotice && (
            <div className="notice warning" style={{ marginBottom: '18px' }}>
              Signed in offline — will sync when reconnected.
            </div>
          )}

          <div className="pin-keypad">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((key, i) => {
              if (key === '') return <div key={i} />
              if (key === '⌫') {
                return (
                  <button key={i} onClick={handleClear} className="pin-key delete">
                    ⌫
                  </button>
                )
              }
              return (
                <button
                  key={i}
                  onClick={() => handleDigit(key)}
                  disabled={loading}
                  className="pin-key"
                >
                  {key}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
