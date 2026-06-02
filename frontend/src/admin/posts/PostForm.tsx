import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Icon from '@/components/ui/Icon'
import {
  adminGetPost,
  adminCreatePost,
  adminUpdatePost,
  uploadFile,
  ZF45ApiError,
} from '@/lib/api'
import type { PostBody } from '@zf45/shared-types'

const EMPTY: PostBody = {
  slug: '',
  title: '',
  excerpt: '',
  body: '',
  coverImageUrl: '',
  published: false,
  tags: [],
}

export default function PostForm() {
  const { id } = useParams<{ id: string }>()
  const isNew = !id
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [form, setForm] = useState<PostBody>(EMPTY)
  const [tagInput, setTagInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'post', id],
    queryFn: () => adminGetPost(id!),
    enabled: !isNew,
  })

  useEffect(() => {
    if (data?.data) {
      const post = data.data
      setForm({
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        body: post.body,
        coverImageUrl: post.coverImageUrl || '',
        published: post.published || false,
        tags: post.tags.map(t => t.slug),
      })
    }
  }, [data])

  const createMutation = useMutation({
    mutationFn: adminCreatePost,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'posts'] })
      navigate('/admin/posts')
    },
    onError: (err) => setError(err instanceof ZF45ApiError ? err.message : 'Failed to save'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: PostBody }) => adminUpdatePost(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'posts'] })
      navigate('/admin/posts')
    },
    onError: (err) => setError(err instanceof ZF45ApiError ? err.message : 'Failed to save'),
  })

  const isSaving = createMutation.isPending || updateMutation.isPending

  function set(k: keyof PostBody) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const val = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value
      setForm(prev => ({ ...prev, [k]: val }))
    }
  }

  function addTag() {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, '-')
    if (t && !form.tags.includes(t)) {
      setForm(prev => ({ ...prev, tags: [...(prev.tags || []), t] }))
    }
    setTagInput('')
  }

  function removeTag(tag: string) {
    setForm(prev => ({ ...prev, tags: (prev.tags || []).filter((t: string) => t !== tag) }))
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadFile(file)
      setForm(prev => ({ ...prev, coverImageUrl: url }))
    } catch {
      setError('Image upload failed')
    } finally {
      setUploading(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (isNew) {
      createMutation.mutate(form)
    } else {
      updateMutation.mutate({ id: id!, body: form })
    }
  }

  if (!isNew && isLoading) {
    return <div style={{ padding: 48, textAlign: 'center' }}><span className="mono caption" style={{ color: '#6b6664' }}>Loading…</span></div>
  }

  return (
    <div>
      <div className="row gap-2" style={{ alignItems: 'center', marginBottom: 12, color: '#6b6664' }}>
        <Link to="/admin/posts" className="caption mono" style={{ color: '#bdbdbd' }}>Posts</Link>
        <span className="caption mono">/</span>
        <span className="caption mono" style={{ color: '#bdbdbd' }}>{isNew ? 'New post' : 'Edit'}</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <h1 className="h2" style={{ fontSize: 24 }}>{isNew ? 'New post' : 'Edit post'}</h1>
        <div className="row gap-2">
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setPreview(!preview)}>
            <Icon name={preview ? 'edit' : 'eye'} size={14} /> {preview ? 'Edit' : 'Preview'}
          </button>
          <Link to="/admin/posts" className="btn btn-outline btn-sm">Cancel</Link>
          <button form="post-form" type="submit" className="btn btn-primary btn-sm" disabled={isSaving}>
            {isSaving ? 'Saving…' : 'Save post'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: 12, marginBottom: 20, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6 }}>
          <span className="small" style={{ color: '#ef4444' }}>{error}</span>
        </div>
      )}

      {preview ? (
        <div className="card" style={{ padding: 32 }}>
          <h2 className="h2" style={{ marginBottom: 8 }}>{form.title || 'Untitled'}</h2>
          <p className="lead" style={{ marginBottom: 24 }}>{form.excerpt}</p>
          <div className="prose">
            <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 14, lineHeight: '22px', color: '#bdbdbd' }}>{form.body}</pre>
          </div>
        </div>
      ) : (
        <form id="post-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="form-grid">
            <div className="form-row">
              <label className="field-label" htmlFor="slug">Slug</label>
              <input id="slug" className="field" placeholder="post-slug" value={form.slug} onChange={set('slug')} required pattern="[a-z0-9-]+" />
            </div>
            <div className="form-row">
              <label className="field-label" htmlFor="title">Title</label>
              <input id="title" className="field" placeholder="Post title" value={form.title} onChange={set('title')} required />
            </div>
          </div>

          <div className="form-row">
            <label className="field-label" htmlFor="excerpt">Excerpt (max 400 chars)</label>
            <textarea id="excerpt" className="field" placeholder="Brief summary…" value={form.excerpt} onChange={set('excerpt')} maxLength={400} rows={2} required />
            <span className="caption" style={{ color: '#6b6664', marginTop: 4 }}>{400 - form.excerpt.length} left</span>
          </div>

          <div className="form-row">
            <label className="field-label" htmlFor="body">Body (Markdown)</label>
            <textarea id="body" className="field" placeholder="Write your post in Markdown…" value={form.body} onChange={set('body')} rows={20} required style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }} />
          </div>

          <div className="form-row">
            <label className="field-label">Tags</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="field"
                placeholder="Add tag (slug)…"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
              />
              <button type="button" className="btn btn-outline btn-sm" onClick={addTag}>Add</button>
            </div>
            {(form.tags || []).length > 0 && (
              <div className="chips" style={{ marginTop: 8 }}>
                {(form.tags || []).map(t => (
                  <button key={t} type="button" className="chip active" onClick={() => removeTag(t)}>
                    #{t} ×
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="form-row">
            <label className="field-label">Cover image</label>
            {form.coverImageUrl && (
              <div style={{ marginBottom: 8, position: 'relative', display: 'inline-block' }}>
                <img src={form.coverImageUrl} alt="" style={{ height: 80, borderRadius: 4, border: '1px solid #3d3a39' }} />
                <button type="button" className="icon-btn danger" style={{ position: 'absolute', top: 4, right: 4 }} onClick={() => setForm(prev => ({ ...prev, coverImageUrl: '' }))}>
                  <Icon name="close" size={12} />
                </button>
              </div>
            )}
            <div className="row gap-2">
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
              <button type="button" className="btn btn-outline btn-sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? 'Uploading…' : 'Upload image'}
              </button>
              <input className="field" placeholder="Paste image URL…" value={form.coverImageUrl || ''} onChange={set('coverImageUrl')} style={{ flex: 1 }} />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 16, border: '1px solid #3d3a39', borderRadius: 6 }}>
            <input id="published" type="checkbox" checked={form.published} onChange={set('published')} style={{ accentColor: '#00d992', width: 16, height: 16 }} />
            <label htmlFor="published" className="body-strong" style={{ fontSize: 14 }}>
              Published (visible on public site · triggers rebuild)
            </label>
          </div>
        </form>
      )}
    </div>
  )
}
