import { Link, useParams, Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import Icon from '@/components/ui/Icon'
import { adminGetContact, ZF45ApiError } from '@/lib/api'

export default function ContactDetail() {
  const { id } = useParams<{ id: string }>()

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'contact', id],
    queryFn: () => adminGetContact(id!),
    enabled: !!id,
  })

  if (error instanceof ZF45ApiError && error.status === 404) {
    return <Navigate to="/admin/contact" replace />
  }

  const contact = data?.data

  return (
    <div>
      <div className="row gap-2" style={{ alignItems: 'center', marginBottom: 12, color: '#6b6664' }}>
        <Link to="/admin/contact" className="caption mono" style={{ color: '#bdbdbd' }}>Contact</Link>
        <span className="caption mono">/</span>
        <span className="caption mono" style={{ color: '#bdbdbd' }}>{id?.slice(0, 8)}</span>
      </div>

      {isLoading && (
        <div style={{ padding: 48, textAlign: 'center' }}>
          <span className="mono caption" style={{ color: '#6b6664' }}>Loading…</span>
        </div>
      )}

      {contact && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h1 className="h2" style={{ fontSize: 24 }}>{contact.subject}</h1>
              <div className="row gap-3" style={{ alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
                <span className="row" style={{ alignItems: 'center' }}>
                  <span className={`status-dot ${contact.status}`} />
                  <span className="caption">{contact.status.replace('_', ' ')}</span>
                </span>
                <span className="caption mono" style={{ color: '#6b6664' }}>{new Date(contact.createdAt).toISOString().replace('T', ' ').slice(0, 16)} UTC</span>
              </div>
            </div>
            <Link to="/admin/contact" className="btn btn-outline btn-sm">
              <Icon name="arrowLeft" size={14} /> Back
            </Link>
          </div>

          <div className="g-2-narrow">
            <div className="card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid #3d3a39' }}>
                <div>
                  <span className="field-label">From</span>
                  <div className="body-strong" style={{ marginTop: 4 }}>{contact.name}</div>
                  <a href={`mailto:${contact.email}`} className="small" style={{ color: '#00d992' }}>{contact.email}</a>
                </div>
              </div>
              <div>
                <span className="field-label">Message</span>
                <p className="body" style={{ marginTop: 8, whiteSpace: 'pre-wrap', lineHeight: '24px' }}>{contact.message}</p>
              </div>
            </div>

            <aside className="col gap-4">
              <div className="card" style={{ padding: 22 }}>
                <span className="caption" style={{ color: '#8b949e', letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: 600 }}>Meta</span>
                <dl style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    ['IP', contact.ipAddress],
                    ['Email attempts', String(contact.emailAttempts)],
                    ['User agent', contact.userAgent?.slice(0, 40) + '…'],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <dt className="caption" style={{ color: '#8b949e' }}>{k}</dt>
                      <dd className="mono small" style={{ color: '#f2f2f2', wordBreak: 'break-all' }}>{v || '—'}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <a href={`mailto:${contact.email}?subject=Re: ${encodeURIComponent(contact.subject)}`} className="btn btn-primary" style={{ width: '100%' }}>
                Reply via email →
              </a>
            </aside>
          </div>
        </>
      )}
    </div>
  )
}
