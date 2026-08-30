import { useState } from 'react'

interface Props {
  staffName: string
  onBack: () => void
  onSuccess: (
    user: { id: string; firstName: string; roles: string[] },
    mode: 'online' | 'offline'
  ) => void
}

export default function PasswordLogin({ staffName, onBack, onSuccess }: Props): React.JSX.Element {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const result = await window.api.auth.login(email.trim(), password)
    setLoading(false)

    if (!result.success || !result.user) {
      setError(result.error ?? 'Login failed.')
      return
    }

    onSuccess(
      { id: result.user.id, firstName: result.user.firstName, roles: result.user.roles },
      'online'
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-brand-panel">
        <div className="auth-logo">
          <span className="auth-logo-mark">B</span>
          Business OS
        </div>

        <div>
          <h1 className="auth-brand-title">Run your floor with confidence.</h1>
          <p className="auth-brand-copy">
            Owner and manager sign-in is protected with your email and password, and keeps every
            branch in sync in real time.
          </p>
        </div>

        <div className="auth-stat-row">
          <div className="auth-stat">
            <strong>Secure</strong>
            <span>Encrypted sign-in</span>
          </div>
          <div className="auth-stat">
            <strong>Synced</strong>
            <span>Live across branches</span>
          </div>
        </div>
      </div>

      <div className="auth-content">
        <div className="auth-card">
          <button type="button" onClick={onBack} className="auth-back">
            ← Back
          </button>

          <p className="auth-eyebrow">Owner &amp; Admin</p>
          <h2 className="auth-heading">{staffName}</h2>
          <p className="auth-description">
            Sign in with your email and password. Requires internet connection.
          </p>

          <form onSubmit={handleSubmit}>
            <label className="form-label">
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
                className="form-field"
              />
            </label>

            <label className="form-label">
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-field"
              />
            </label>

            {error && <div className="error-text">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="ui-button primary"
              style={{ width: '100%', padding: '13px', fontSize: '13px' }}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
