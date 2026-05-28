import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Icon from '@/components/ui/Icon'
import {
  adminGetPortfolioItem,
  adminCreatePortfolio,
  adminUpdatePortfolio,
  uploadFile,
  ZF45ApiError,
} from '@/lib/api'
import type { PortfolioBody } from '@zf45/shared-types'

const EMPTY: PortfolioBody = {
  slug: '',
  title: '',
  description: '',
  body: '',
  techStack: [],
  outcome: '',
  projectUrl: '',
  coverImageUrl: '',
  sortOrder: 0,
  published: false,
}

export default function PortfolioForm() {
  const { id } = useParams<{ id: string }>()
  const isNew = !id
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [form, setForm] = useState<PortfolioBody>(EMPTY)
  const [techInput, setTechInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'portfolio', id],
    queryFn: () => adminGetPortfolioItem(id!),
    enabled: !isNew,
  })

  useEffect(() => {
    if (data?.data) {
      const item = data.data
      setForm({
        slug: item.slug,
        title: item.title,
        description: item.description,
        body: item.body,
        techStack: item.techStack,
        outcome: item.outcome ?? '',
        projectUrl: item.projectUrl ?? '',
        coverImageUrl: item.coverImageUrl ?? '',
        sortOrder: item.sortOrder,
        published: item.published ?? false,
      })
    }
  }, [data])

  const createMutation = useMutation({
    mutationFn: adminCreatePortfolio,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'portfolio'] })
      navigate('/admin/portfolio')
    },
    onError: (err) => setError(err instanceof ZF45ApiError ? err.message : 'Failed to save'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: PortfolioBody }) => adminUpdatePortfolio(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'portfolio'] })
      navigate('/admin/portfolio')
    },
    onError: (err) => setError(err instanceof ZF45ApiError ? err.message : 'Failed to save'),
  })

  const isSaving = createMutation.isPending || updateMutation.isPending

  function set(k: keyof PortfolioBody) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const val = 'checked' in e.target ? e.target.checked : e.target.type === 'number' ? Number(e.target.value) : e.target.value
      setForm(prev => ({ ...prev, [k]: val }))
    }
  }

  function addTech() {
    const t = techInput.trim()
    if (t && !form.techStack.includes(t)) {
      setForm(prev => ({ ...prev, techStack: [...prev.techStack, t] }))
    }
    setTechInput('')
  }

  function removeTech(tech: string) {
    setForm(prev => ({ ...prev, techStack: prev.techStack.filter(t => t !== tech) }))
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
        <Link to="/admin/portfolio" className="caption mono" style={{ color: '#bdbdbd' }}>Portfolio</Link>
        <span className="caption mono">/</span>
        <span className="caption mono" style={{ color: '#bdbdbd' }}>{isNew ? 'New project' : 'Edit'}</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <h1 className="h2" style={{ fontSize: 24 }}>{isNew ? 'New project' : 'Edit project'}</h1>
        <div className="row gap-2">
          <Link to="/admin/portfolio" className="btn btn-outline btn-sm">Cancel</Link>
          <button form="portfolio-form" type="submit" className="btn btn-primary btn-sm" disabled={isSaving}>
            {isSaving ? 'Saving…' : 'Save project'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: 12, marginBottom: 20, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6 }}>
          <span className="small" style={{ color: '#ef4444' }}>{error}</span>
        </div>
      )}

      <form id="portfolio-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div className="form-grid">
          <div className="form-row">
            <label className="field-label" htmlFor="slug">Slug</label>
            <input id="slug" className="field" placeholder="project-slug" value={form.slug} onChange={set('slug')} required pattern="[a-z0-9-]+" />
          </div>
          <div className="form-row">
            <label className="field-label" htmlFor="title">Title</label>
            <input id="title" className="field" placeholder="Project title" value={form.title} onChange={set('title')} required />
          </div>
        </div>

        <div className="form-row">
          <label className="field-label" htmlFor="description">Description (max 280 chars)</label>
          <input id="description" className="field" placeholder="Short description…" value={form.description} onChange={set('description')} maxLength={280} required />
          <span className="caption" style={{ color: '#6b6664', marginTop: 4 }}>{280 - form.description.length} left</span>
        </div>

        <div className="form-row">
          <label className="field-label" htmlFor="body">Body (Markdown)</label>
          <textarea id="body" className="field" placeholder="# Project overview..." value={form.body} onChange={set('body')} rows={12} required style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }} />
        </div>

        <div className="form-row">
          <label className="field-label">Tech stack</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="field"
              placeholder="Add technology…"
              value={techInput}
              onChange={e => setTechInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTech() } }}
            />
            <button type="button" className="btn btn-outline btn-sm" onClick={addTech}>Add</button>
          </div>
          {form.techStack.length > 0 && (
            <div className="chips" style={{ marginTop: 8 }}>
              {form.techStack.map(t => (
                <button key={t} type="button" className="chip active" onClick={() => removeTech(t)} style={{ cursor: 'pointer' }}>
                  {t} ×
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="form-row">
          <label className="field-label" htmlFor="outcome">Outcome (optional)</label>
          <input id="outcome" className="field" placeholder="Key result or metric…" value={form.outcome || ''} onChange={set('outcome')} maxLength={280} />
        </div>

        <div className="form-grid">
          <div className="form-row">
            <label className="field-label" htmlFor="projectUrl">Project URL (optional)</label>
            <input id="projectUrl" className="field" type="url" placeholder="https://…" value={form.projectUrl || ''} onChange={set('projectUrl')} />
          </div>
          <div className="form-row">
            <label className="field-label" htmlFor="sortOrder">Sort order</label>
            <input id="sortOrder" className="field" type="number" value={form.sortOrder} onChange={set('sortOrder')} />
          </div>
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
            <span className="small" style={{ alignSelf: 'center', color: '#6b6664' }}>or</span>
            <input className="field" placeholder="Paste image URL…" value={form.coverImageUrl || ''} onChange={set('coverImageUrl')} style={{ flex: 1 }} />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 16, border: '1px solid #3d3a39', borderRadius: 6 }}>
          <input id="published" type="checkbox" checked={form.published} onChange={set('published')} style={{ accentColor: '#00d992', width: 16, height: 16 }} />
          <label htmlFor="published" className="body-strong" style={{ fontSize: 14 }}>Published (visible on public site)</label>
        </div>
      </form>
    </div>
  )
}
