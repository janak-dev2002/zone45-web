import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { adminGetContacts } from '@/lib/api'

const STATUS_FILTERS = ['All', 'received', 'emailed', 'pending_email', 'email_failed']

export default function ContactList() {
  const [filter, setFilter] = useState('All')
  const [page, setPage] = useState(1)

  const statusParam = filter === 'All' ? undefined : filter

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'contacts', page, statusParam],
    queryFn: () => adminGetContacts(page, 20, statusParam),
  })

  const contacts = data?.data || []
  const pagination = data?.pagination

  return (
    <div>
      <div className="row gap-2" style={{ alignItems: 'center', marginBottom: 12, color: '#6b6664' }}>
        <span className="caption mono">admin</span>
        <span className="caption mono">/</span>
        <span className="caption mono" style={{ color: '#bdbdbd' }}>contact</span>
      </div>

      <div style={{ marginBottom: 24 }}>
        <h1 className="h2" style={{ fontSize: 26 }}>Contact submissions</h1>
        <p className="small" style={{ marginTop: 4 }}>Read-only · append-only from public form</p>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div className="chips">
          {STATUS_FILTERS.map(f => (
            <button key={f} className={`chip${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>
              {f === 'All' ? 'All' : f.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div style={{ padding: 48, textAlign: 'center' }}>
          <span className="mono caption" style={{ color: '#6b6664' }}>Loading…</span>
        </div>
      )}

      {!isLoading && (
        <>
          <table className="tbl">
            <thead>
              <tr>
                <th>From</th>
                <th>Subject</th>
                <th style={{ width: 120 }}>Status</th>
                <th style={{ width: 120 }}>Received</th>
                <th style={{ width: 60 }}></th>
              </tr>
            </thead>
            <tbody>
              {contacts.map(c => (
                <tr key={c.id}>
                  <td>
                    <div className="body-strong" style={{ fontSize: 14 }}>{c.name}</div>
                    <div className="caption mono" style={{ color: '#6b6664' }}>{c.email}</div>
                  </td>
                  <td>
                    <div className="small" style={{ color: '#f2f2f2' }}>{c.subject}</div>
                    <div className="caption" style={{ color: '#8b949e' }}>{c.messagePreview}</div>
                  </td>
                  <td>
                    <span className="row" style={{ alignItems: 'center' }}>
                      <span className={`status-dot ${c.status}`} />
                      <span className="caption">{c.status.replace('_', ' ')}</span>
                    </span>
                  </td>
                  <td className="mono caption">{new Date(c.createdAt).toISOString().slice(0, 10)}</td>
                  <td>
                    <Link to={`/admin/contact/${c.id}`} className="icon-btn" aria-label="View full message">
                      →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {contacts.length === 0 && (
            <div style={{ padding: 48, textAlign: 'center', color: '#6b6664' }}>
              <div className="mono" style={{ fontSize: 13 }}>// no submissions yet</div>
            </div>
          )}

          {pagination && pagination.total > 20 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, flexWrap: 'wrap', gap: 12 }}>
              <span className="caption mono" style={{ color: '#6b6664' }}>
                Showing {contacts.length} of {pagination.total}
              </span>
              <div className="row gap-2" style={{ alignItems: 'center' }}>
                <button className="btn btn-outline btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>← Prev</button>
                <span className="caption mono" style={{ color: '#bdbdbd' }}>page {pagination.page} / {Math.ceil(pagination.total / pagination.pageSize)}</span>
                <button className="btn btn-outline btn-sm" onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(pagination.total / pagination.pageSize)}>Next →</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
