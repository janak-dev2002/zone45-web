import { useState, useRef } from 'react'
import { Helmet } from 'react-helmet-async'
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile'
import PageLayout from '@/components/ui/PageLayout'
import Icon from '@/components/ui/Icon'
import { submitContact, ZF45ApiError } from '@/lib/api'

const SUBJECTS = ['Full-stack web', 'IoT / embedded', 'Mobile (iOS / Android)', 'Audit or review', 'Speaking / press', 'Something else']
const BUDGETS = ['< €15k', '€15 — 40k', '€40 — 80k', '€80k+', 'Tell me']

interface FormState {
  name: string
  email: string
  subject: string
  message: string
  budget: string
  gdpr: boolean
}

export default function Contact() {
  const [form, setForm] = useState<FormState>({
    name: '',
    email: '',
    subject: 'Full-stack web',
    message: '',
    budget: '',
    gdpr: true,
  })
  const [submitted, setSubmitted] = useState(false)
  const [submissionId, setSubmissionId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [retryAfter, setRetryAfter] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const turnstileRef = useRef<TurnstileInstance | undefined>(undefined)
  const [turnstileToken, setTurnstileToken] = useState('')
  const charsLeft = 5000 - form.message.length

  const update = (k: keyof FormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm(prev => ({ ...prev, [k]: 'checked' in e.target ? e.target.checked : e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.gdpr) return
    setLoading(true)
    setError(null)

    try {
      const res = await submitContact({
        name: form.name,
        email: form.email,
        subject: form.subject,
        message: `Budget: ${form.budget || 'Not specified'}\n\n${form.message}`,
        hpField: '',
        turnstileToken: turnstileToken || 'dev-token',
      })
      setSubmissionId(res.data.submissionId)
      setSubmitted(true)
    } catch (err) {
      if (err instanceof ZF45ApiError) {
        if (err.status === 429) {
          setRetryAfter(err.retryAfter || 60)
          setError(`Too many submissions. Please wait ${err.retryAfter || 60} seconds.`)
        } else {
          setError(err.message)
        }
      } else {
        setError('Something went wrong. Please try again.')
      }
      turnstileRef.current?.reset?.()
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Helmet>
        <title>Contact — ZoneForty5</title>
        <meta name="description" content="Start a project with ZoneForty5. Fixed-fee quote in 48 hours." />
        <meta property="og:title" content="Contact — ZoneForty5" />
        <meta property="og:description" content="Tell me what's broken. I'll tell you what it takes to fix it." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://zoneforty5.tech/contact" />
        <link rel="canonical" href="https://zoneforty5.tech/contact" />
      </Helmet>

      <PageLayout>
        <section className="band">
          <div className="container">
            <div className="g-2-wide">
              <div className="col gap-5">
                <span className="eyebrow">Contact · Q3 2026 intake</span>
                <h1 className="h1" style={{ fontSize: 56, lineHeight: '60px' }}>
                  Tell me what's broken. I'll tell you what it takes to fix it.
                </h1>
                <p className="lead">
                  Submit the form and you'll hear back inside one business day with one of
                  three answers: (a) a 30-minute call, (b) a referral to someone better-fit, or (c) a polite
                  no with a reason.
                </p>

                <div style={{ marginTop: 16, padding: 24, border: '1px solid #3d3a39', borderRadius: 8, background: '#0a0a0a', display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {[
                    ['Pager', 'hi@zoneforty5.tech', 'mail'],
                    ['Signal', 'On request after intake', 'lock'],
                    ['Response window', '1 business day', 'activity'],
                  ].map(([k, v, icon]) => (
                    <div key={k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, paddingBottom: 10, borderBottom: '1px dashed rgba(79,93,117,0.4)' }}>
                      <span className="row gap-3" style={{ alignItems: 'center' }}>
                        <Icon name={icon as 'mail' | 'lock' | 'activity'} size={14} color="#00d992" />
                        <span className="caption" style={{ color: '#8b949e', letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: 600 }}>{k}</span>
                      </span>
                      <span className="mono small" style={{ color: '#f2f2f2' }}>{v}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                    <span className="row gap-3" style={{ alignItems: 'center' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00d992', boxShadow: '0 0 0 3px rgba(0,217,146,0.18)' }} />
                      <span className="caption" style={{ color: '#8b949e', letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: 600 }}>Next slot</span>
                    </span>
                    <span className="mono small" style={{ color: '#00d992' }}>Q3 2026 · closes 14 Aug</span>
                  </div>
                </div>

                <div className="code-block" style={{ marginTop: 16 }}>
                  <div className="caption mono" style={{ color: '#6b6664', marginBottom: 8 }}>// what a good first message looks like</div>
                  <div style={{ color: '#bdbdbd' }}>1. who you are &amp; what you make</div>
                  <div style={{ color: '#bdbdbd' }}>2. the thing that's broken or missing</div>
                  <div style={{ color: '#bdbdbd' }}>3. when you need it shipped</div>
                  <div style={{ color: '#bdbdbd' }}>4. budget range, even a rough one</div>
                </div>
              </div>

              <div className="card" style={{ padding: 36 }}>
                {submitted ? (
                  <SubmittedNote name={form.name} email={form.email} submissionId={submissionId} onReset={() => setSubmitted(false)} />
                ) : (
                  <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                    <div className="row gap-3" style={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                      <span className="codechip">POST /intake</span>
                      <span className="mono caption" style={{ color: '#6b6664' }}>id: intake.2026.q3</span>
                    </div>

                    <div className="form-grid">
                      <div className="form-row">
                        <label className="field-label" htmlFor="name">Name</label>
                        <input id="name" name="name" className="field" placeholder="Your name" value={form.name} onChange={update('name')} required />
                      </div>
                      <div className="form-row">
                        <label className="field-label" htmlFor="email">Email</label>
                        <input id="email" name="email" className="field" type="email" placeholder="you@company.com" value={form.email} onChange={update('email')} required />
                      </div>
                    </div>

                    <div className="form-row">
                      <label className="field-label" htmlFor="subject">Subject</label>
                      <div style={{ position: 'relative' }}>
                        <select id="subject" name="subject" className="field" value={form.subject} onChange={update('subject')} style={{ appearance: 'none', paddingRight: 38 }}>
                          {SUBJECTS.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                        <div style={{ position: 'absolute', right: 12, top: 0, bottom: 0, display: 'flex', alignItems: 'center', pointerEvents: 'none', color: '#8b949e' }}>
                          <Icon name="chevDown" size={16} />
                        </div>
                      </div>
                    </div>

                    <div className="form-row">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <label className="field-label" htmlFor="message">Message</label>
                        <span className="caption mono" style={{ color: charsLeft < 200 ? '#ef4444' : '#6b6664' }}>
                          {charsLeft} chars left
                        </span>
                      </div>
                      <textarea
                        id="message"
                        name="message"
                        className="field"
                        placeholder="Tell me about the system you want shipped. Include a rough timeline and budget if you have one."
                        value={form.message}
                        onChange={update('message')}
                        rows={6}
                        maxLength={5000}
                        required
                      />
                    </div>

                    <div className="form-row">
                      <label className="field-label">Budget range</label>
                      <div className="chips">
                        {BUDGETS.map(b => (
                          <button
                            key={b}
                            type="button"
                            className={`chip${form.budget === b ? ' active' : ''}`}
                            onClick={() => setForm(prev => ({ ...prev, budget: b }))}
                          >
                            {b}
                          </button>
                        ))}
                      </div>
                    </div>

                    <Turnstile
                      ref={turnstileRef}
                      siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'}
                      onSuccess={setTurnstileToken}
                      options={{ theme: 'dark' }}
                    />

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, border: '1px dashed rgba(79,93,117,0.4)', borderRadius: 6 }}>
                      <input type="checkbox" id="gdpr" name="gdpr" checked={form.gdpr} onChange={update('gdpr')} style={{ accentColor: '#00d992', width: 16, height: 16, flexShrink: 0 }} />
                      <label htmlFor="gdpr" className="small" style={{ color: '#bdbdbd', lineHeight: '20px' }}>
                        I understand my message is read by the studio only and deleted within 30 days if we don't engage.
                      </label>
                    </div>

                    {error && (
                      <div style={{ padding: 12, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6 }}>
                        <span className="small" style={{ color: '#ef4444' }}>{error}</span>
                        {retryAfter && (
                          <span className="mono small" style={{ color: '#6b6664', marginLeft: 8 }}>Retry after {retryAfter}s</span>
                        )}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid #3d3a39', flexWrap: 'wrap' }}>
                      <span className="caption mono" style={{ color: '#6b6664' }}>Encrypted in transit · TLS 1.3 · No tracking</span>
                      <button type="submit" className="btn btn-primary" disabled={loading || !form.gdpr}>
                        {loading ? 'Sending…' : 'Send intake →'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </section>
      </PageLayout>
    </>
  )
}

function SubmittedNote({ name, email, submissionId, onReset }: { name: string; email: string; submissionId: string; onReset: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="row gap-3" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="codechip" style={{ background: 'rgba(0,217,146,0.1)', color: '#00d992' }}>202 Accepted · received</span>
        <span className="mono caption" style={{ color: '#6b6664' }}>req: {submissionId.slice(0, 8)}</span>
      </div>
      <div style={{ width: 48, height: 48, borderRadius: 8, background: 'rgba(0,217,146,0.08)', border: '1px solid rgba(0,217,146,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="check" size={22} color="#00d992" />
      </div>
      <h2 className="h2" style={{ fontSize: 28 }}>
        Thanks{name ? `, ${name.split(' ')[0]}` : ''}. We'll be in touch.
      </h2>
      <p className="body">
        Your intake is queued. Expect a reply at{' '}
        <span className="codechip" style={{ fontSize: 12 }}>{email || 'your email'}</span>{' '}
        within one business day.
      </p>
      <div style={{ background: '#0a0a0a', border: '1px dashed rgba(79,93,117,0.4)', borderRadius: 8, padding: 16, fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: '#bdbdbd', lineHeight: '22px' }}>
        <div><span style={{ color: '#6b6664' }}>$</span> <span style={{ color: '#00d992' }}>queue</span> intake.add --priority=normal</div>
        <div style={{ color: '#8b949e' }}>→ stored · awaiting human triage</div>
      </div>
      <div className="row gap-3" style={{ marginTop: 8 }}>
        <button className="btn btn-ghost btn-sm" onClick={onReset}>Send another</button>
      </div>
    </div>
  )
}
