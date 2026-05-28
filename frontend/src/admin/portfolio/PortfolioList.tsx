import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Icon from '@/components/ui/Icon'
import { adminGetPortfolio, adminDeletePortfolio } from '@/lib/api'

const STATUS_FILTERS = ['All', 'Live', 'Draft']

export default function PortfolioList() {
  const [filter, setFilter] = useState('All')
  const [page, setPage] = useState(1)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'portfolio', page],
    queryFn: () => adminGetPortfolio(page, 20),
  })

  const deleteMutation = useMutation({
    mutationFn: adminDeletePortfolio,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'portfolio'] }),
  })

  const items = data?.data || []
  const pagination = data?.pagination
  const visible = filter === 'All' ? items : items.filter(p =>
    filter === 'Live' ? p.published : !p.published
  )

  function handleDelete(id: string, title: string) {
    if (confirm(`Delete "${title}"? This cannot be undone.`)) {
      deleteMutation.mutate(id)
    }
  }

  return (
    <div>
      <div className="row gap-2" style={{ alignItems: 'center', marginBottom: 12, color: '#6b6664' }}>
        <span className="caption mono">admin</span>
        <span className="caption mono">/</span>
        <span className="caption mono" style={{ color: '#bdbdbd' }}>portfolio</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <div>
          <h1 className="h2" style={{ fontSize: 26 }}>Portfolio</h1>
          <p className="small" style={{ marginTop: 4 }}>
            {items.length} projects · {items.filter(p => p.published).length} live
          </p>
        </div>
        <div className="row gap-2">
          <Link to="/admin/portfolio/new" className="btn btn-primary btn-sm">
            <Icon name="plus" size={14} /> New project
          </Link>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div className="chips">
          {STATUS_FILTERS.map(f => (
            <button key={f} className={`chip${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>{f}</button>
          ))}
        </div>
        <span className="caption mono" style={{ color: '#6b6664' }}>Sort: updated ↓</span>
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
                <th>Project</th>
                <th style={{ width: 90 }}>Status</th>
                <th style={{ width: 130 }}>Updated</th>
                <th style={{ width: 100 }}></th>
              </tr>
            </thead>
            <tbody>
              {visible.map(p => (
                <tr key={p.id}>
                  <td>
                    <div>
                      <div className="body-strong" style={{ fontSize: 14 }}>{p.title}</div>
                      <div className="caption mono" style={{ color: '#6b6664' }}>/{p.slug}</div>
                    </div>
                  </td>
                  <td>
                    <span className="row" style={{ alignItems: 'center' }}>
                      <span className={`status-dot ${p.published ? 'live' : 'draft'}`} />
                      {p.published ? 'Live' : 'Draft'}
                    </span>
                  </td>
                  <td className="mono">{new Date(p.updatedAt).toISOString().slice(0, 10)}</td>
                  <td>
                    <div className="row gap-2">
                      <Link to={`/work/${p.slug}`} target="_blank" className="icon-btn" aria-label="View live">
                        <Icon name="eye" size={14} />
                      </Link>
                      <Link to={`/admin/portfolio/${p.id}`} className="icon-btn" aria-label="Edit">
                        <Icon name="edit" size={14} />
                      </Link>
                      <button
                        className="icon-btn danger"
                        aria-label="Delete"
                        onClick={() => handleDelete(p.id, p.title)}
                        disabled={deleteMutation.isPending}
                      >
                        <Icon name="trash" size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {visible.length === 0 && (
            <div style={{ padding: 48, textAlign: 'center', color: '#6b6664' }}>
              <div className="mono" style={{ fontSize: 13 }}>// no items match current filter</div>
            </div>
          )}

          {pagination && pagination.total > 20 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, flexWrap: 'wrap', gap: 12 }}>
              <span className="caption mono" style={{ color: '#6b6664' }}>
                Showing {visible.length} of {pagination.total}
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
