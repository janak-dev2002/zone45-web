import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Icon from '@/components/ui/Icon'
import { adminGetPosts, adminDeletePost } from '@/lib/api'

const STATUS_FILTERS = ['All', 'Published', 'Draft']

export default function PostsList() {
  const [filter, setFilter] = useState('All')
  const [page, setPage] = useState(1)
  const qc = useQueryClient()

  const statusParam = filter === 'Published' ? 'published' : filter === 'Draft' ? 'draft' : undefined

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'posts', page, statusParam],
    queryFn: () => adminGetPosts(page, 20, statusParam),
  })

  const deleteMutation = useMutation({
    mutationFn: adminDeletePost,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'posts'] }),
  })

  const posts = data?.data || []
  const pagination = data?.pagination

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
        <span className="caption mono" style={{ color: '#bdbdbd' }}>posts</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <div>
          <h1 className="h2" style={{ fontSize: 26 }}>Posts</h1>
          <p className="small" style={{ marginTop: 4 }}>
            {posts.length} posts · {posts.filter(p => p.published).length} published
          </p>
        </div>
        <Link to="/admin/posts/new" className="btn btn-primary btn-sm">
          <Icon name="plus" size={14} /> New post
        </Link>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div className="chips">
          {STATUS_FILTERS.map(f => (
            <button key={f} className={`chip${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>{f}</button>
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
                <th>Title</th>
                <th style={{ width: 110 }}>Status</th>
                <th style={{ width: 120 }}>Published</th>
                <th style={{ width: 100 }}></th>
              </tr>
            </thead>
            <tbody>
              {posts.map(p => (
                <tr key={p.id}>
                  <td>
                    <div>
                      <div className="body-strong" style={{ fontSize: 14 }}>{p.title}</div>
                      <div className="caption mono" style={{ color: '#6b6664' }}>/notes/{p.slug}</div>
                    </div>
                  </td>
                  <td>
                    <span className="row" style={{ alignItems: 'center' }}>
                      <span className={`status-dot ${p.published ? 'live' : 'draft'}`} />
                      {p.published ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="mono">{p.publishedAt ? new Date(p.publishedAt).toISOString().slice(0, 10) : '—'}</td>
                  <td>
                    <div className="row gap-2">
                      {p.published && (
                        <Link to={`/notes/${p.slug}`} target="_blank" className="icon-btn" aria-label="View live">
                          <Icon name="eye" size={14} />
                        </Link>
                      )}
                      <Link to={`/admin/posts/${p.id}`} className="icon-btn" aria-label="Edit">
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

          {posts.length === 0 && (
            <div style={{ padding: 48, textAlign: 'center', color: '#6b6664' }}>
              <div className="mono" style={{ fontSize: 13 }}>// no posts found</div>
              <Link to="/admin/posts/new" className="btn btn-primary btn-sm" style={{ marginTop: 16 }}>Write first post</Link>
            </div>
          )}

          {pagination && pagination.total > 20 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, flexWrap: 'wrap', gap: 12 }}>
              <span className="caption mono" style={{ color: '#6b6664' }}>
                Showing {posts.length} of {pagination.total}
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
