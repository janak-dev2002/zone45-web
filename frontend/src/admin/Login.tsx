import { useState, useRef } from 'react'
import { Navigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile'
import { Wordmark } from '@/components/ui/Logomark'
import Icon from '@/components/ui/Icon'
import { useLogin, useMe } from '@/lib/hooks/useAuth'
import { ZF45ApiError } from '@/lib/api'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [retryAfter, setRetryAfter] = useState<number | null>(null)
  const turnstileRef = useRef<TurnstileInstance | undefined>(undefined)

  const { data: me } = useMe()
  const login = useLogin()

  if (me?.data) return <Navigate to="/admin" replace />

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await login.mutateAsync({ email, password, turnstileToken: turnstileToken || 'dev-token' })
    } catch (err) {
      if (err instanceof ZF45ApiError) {
        if (err.status === 429) {
          setRetryAfter(err.retryAfter || 60)
          setError(`Too many attempts. Please wait ${err.retryAfter || 60} seconds.`)
        } else {
          setError('Invalid email or password.')
        }
      } else {
        setError('Login failed. Please try again.')
      }
      turnstileRef.current?.reset?.()
      setTurnstileToken('')
    }
  }

  return (
    <>
      <Helmet>
        <title>Admin Login — ZoneForty5</title>
      </Helmet>
      <div style={{ minHeight: '100vh' }}>
        <div className="auth-shell">
          <aside className="auth-side">
            <div>
              <Wordmark />
              <div style={{ marginTop: 48 }}>
                <span className="eyebrow">Studio admin · v2026</span>
                <h1 className="h1" style={{ fontSize: 44, lineHeight: '48px', marginTop: 18 }}>
                  Internal console.
                </h1>
                <p className="lead" style={{ marginTop: 16, maxWidth: 360 }}>
                  CMS for the public site, intake queue, and project ledger.
                  Not a SaaS — single tenant, single user.
                </p>
              </div>
            </div>
            <div className="code-block" style={{ maxWidth: 380 }}>
              <div className="caption mono" style={{ color: '#6b6664', marginBottom: 8 }}>// session</div>
              <div><span style={{ color: '#8b949e' }}>$</span> <span className="term-cmd">jwt</span> sign --aud=admin --ttl=15m</div>
              <div style={{ color: '#8b949e', marginTop: 4 }}>→ token issued, 15m expiry</div>
              <div style={{ color: '#8b949e' }}>→ device cookie: hardened (HttpOnly · SameSite=strict)</div>
            </div>
          </aside>

          <main className="auth-main">
            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="row gap-3" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="eyebrow">Sign in</span>
                <span className="codechip" style={{ fontSize: 11 }}>POST /auth/login</span>
              </div>
              <h2 className="h2" style={{ fontSize: 30, lineHeight: '36px' }}>Studio admin</h2>
              <p className="small" style={{ color: '#bdbdbd', marginTop: -10 }}>
                JWT auth · single user · 15-minute session.
              </p>

              <div className="form-row" style={{ marginTop: 8 }}>
                <label className="field-label" htmlFor="email">Email</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="email"
                    className="field"
                    type="email"
                    placeholder="admin@zoneforty5.tech"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    style={{ paddingLeft: 38 }}
                    required
                    autoComplete="username"
                  />
                  <div style={{ position: 'absolute', left: 12, top: 0, bottom: 0, display: 'flex', alignItems: 'center', color: '#6b6664' }}>
                    <Icon name="mail" size={16} />
                  </div>
                </div>
              </div>

              <div className="form-row">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <label className="field-label" htmlFor="password">Password</label>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    id="password"
                    className="field"
                    type={showPw ? 'text' : 'password'}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    style={{ paddingLeft: 38, paddingRight: 44 }}
                    required
                    autoComplete="current-password"
                  />
                  <div style={{ position: 'absolute', left: 12, top: 0, bottom: 0, display: 'flex', alignItems: 'center', color: '#6b6664' }}>
                    <Icon name="lock" size={16} />
                  </div>
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => setShowPw(!showPw)}
                    style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)' }}
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                  >
                    <Icon name={showPw ? 'eyeOff' : 'eye'} size={16} />
                  </button>
                </div>
              </div>

              <Turnstile
                ref={turnstileRef}
                siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'}
                onSuccess={setTurnstileToken}
                options={{ theme: 'dark' }}
              />

              {error && (
                <div style={{ padding: 12, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6 }}>
                  <span className="small" style={{ color: '#ef4444' }}>{error}</span>
                  {retryAfter && <span className="mono small" style={{ color: '#6b6664', marginLeft: 8 }}>({retryAfter}s)</span>}
                </div>
              )}

              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={login.isPending}>
                {login.isPending ? 'Signing in…' : 'Sign in →'}
              </button>

              <div style={{ paddingTop: 16, borderTop: '1px dashed rgba(79,93,117,0.4)', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span className="caption" style={{ color: '#6b6664' }}>
                  TLS 1.3 · jwt-hs256
                </span>
                <span className="caption mono" style={{ color: '#6b6664' }}>single user</span>
              </div>
            </form>
          </main>
        </div>
      </div>
    </>
  )
}
