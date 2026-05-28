import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import PageLayout from '@/components/ui/PageLayout'
import Icon from '@/components/ui/Icon'
import ProjectThumb from '@/components/portfolio/ProjectThumb'
import { SkeletonCard } from '@/components/ui/SkeletonBlock'
import { getPortfolio } from '@/lib/api'
import type { PortfolioItem } from '@zf45/shared-types'

const THUMB_KINDS = ['line', 'grid', 'bars', 'kanban', 'map', 'sparkline'] as const

export default function Portfolio() {
  const [activeTag, setActiveTag] = useState('All')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['portfolio'],
    queryFn: () => getPortfolio(1, 100),
  })

  const items = data?.data || []
  const allTechs = ['All', ...Array.from(new Set(items.flatMap(p => p.techStack)))]
  const visible = activeTag === 'All' ? items : items.filter(p => p.techStack.includes(activeTag))

  return (
    <>
      <Helmet>
        <title>Selected Work — ZoneForty5</title>
        <meta name="description" content="Fourteen production systems. Full-stack web, IoT, and mobile — every one still running today." />
        <meta property="og:title" content="Selected Work — ZoneForty5" />
        <meta property="og:description" content="Fourteen production systems. Every one still running today." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://zoneforty5.tech/work" />
        <link rel="canonical" href="https://zoneforty5.tech/work" />
      </Helmet>

      <PageLayout>
        <section className="band">
          <div className="container">
            <div className="section-head">
              <span className="eyebrow">Selected work · 2022 → 2026</span>
              <h1 className="h1">Fourteen production systems. Six worth showing.</h1>
              <p className="lead">
                Every one of these is still running today. References available on request — every client is on the call.
              </p>
            </div>

            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: 16, paddingBottom: 24, marginBottom: 32, borderBottom: '1px solid #3d3a39',
              flexWrap: 'wrap',
            }}>
              <div className="row gap-3" style={{ alignItems: 'center' }}>
                <Icon name="filter" size={16} color="#8b949e" />
                <span className="caption" style={{ color: '#8b949e', letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: 600 }}>Filter by stack</span>
              </div>
              <div className="chips">
                {allTechs.map(t => (
                  <button key={t} className={`chip${activeTag === t ? ' active' : ''}`} onClick={() => setActiveTag(t)}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {isLoading && (
              <div className="g-2">
                {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            )}

            {isError && (
              <div style={{ padding: 64, textAlign: 'center', color: '#6b6664', border: '1px dashed #3d3a39', borderRadius: 8 }}>
                <div className="mono" style={{ fontSize: 13 }}>// failed to load projects</div>
                <button className="btn btn-outline btn-sm" style={{ marginTop: 16 }}>Retry</button>
              </div>
            )}

            {!isLoading && !isError && (
              <>
                <div className="g-2">
                  {visible.map((p, i) => (
                    <ProjectCard key={p.id} item={p} index={i} />
                  ))}
                </div>

                {visible.length === 0 && (
                  <div style={{ padding: 64, textAlign: 'center', color: '#6b6664', border: '1px dashed #3d3a39', borderRadius: 8 }}>
                    <div className="mono" style={{ fontSize: 13 }}>// no projects match #{activeTag}</div>
                    <button className="btn btn-outline btn-sm" style={{ marginTop: 16 }} onClick={() => setActiveTag('All')}>
                      Reset filter
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </PageLayout>
    </>
  )
}

function ProjectCard({ item, index }: { item: PortfolioItem; index: number }) {
  const thumbKind = THUMB_KINDS[index % THUMB_KINDS.length]

  return (
    <Link to={`/work/${item.slug}`} style={{ textDecoration: 'none' }}>
      <article className="proj">
        <div className="proj-thumb">
          <span className="proj-thumb-num">// {String(index + 1).padStart(2, '0')}</span>
          <ProjectThumb kind={thumbKind} coverImageUrl={item.coverImageUrl} />
          {index === 0 && (
            <div style={{ position: 'absolute', top: 14, right: 14 }}>
              <span className="pill pill-live mono" style={{ fontSize: 11 }}>Featured</span>
            </div>
          )}
        </div>
        <div className="proj-body">
          <div className="proj-meta">
            <span className="caption mono" style={{ color: '#00d992' }}>{item.slug.replace(/-/g, ' ')}</span>
            <span className="caption" style={{ color: '#3d3a39' }}>·</span>
            <span className="caption">{new Date(item.createdAt).getFullYear()}</span>
          </div>
          <h3 className="h3" style={{ textWrap: 'balance', fontSize: 22, lineHeight: '28px' } as React.CSSProperties}>{item.title}</h3>
          <p className="body" style={{ fontSize: 14, lineHeight: '22px' }}>{item.description}</p>
          {item.outcome && (
            <p className="small" style={{ color: '#00d992', fontSize: 13 }}>{item.outcome}</p>
          )}
          <div className="row" style={{ flexWrap: 'wrap', gap: 6, marginTop: 'auto', paddingTop: 8 }}>
            {item.techStack.map(s => (
              <span key={s} className="codechip" style={{ fontSize: 11, padding: '2px 7px' }}>{s}</span>
            ))}
          </div>
        </div>
      </article>
    </Link>
  )
}
