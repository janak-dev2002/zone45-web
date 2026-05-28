import { Helmet } from 'react-helmet-async'
import { Link, useParams, Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import remarkGfm from 'remark-gfm'
import PageLayout from '@/components/ui/PageLayout'
import Icon from '@/components/ui/Icon'
import ProjectThumb from '@/components/portfolio/ProjectThumb'
import SkeletonBlock from '@/components/ui/SkeletonBlock'
import { getPortfolioItem, ZF45ApiError } from '@/lib/api'

export default function PortfolioDetail() {
  const { slug } = useParams<{ slug: string }>()

  const { data, isLoading, error } = useQuery({
    queryKey: ['portfolio', slug],
    queryFn: () => getPortfolioItem(slug!),
    enabled: !!slug,
  })

  if (error instanceof ZF45ApiError && error.status === 404) {
    return <Navigate to="/work" replace />
  }

  const item = data?.data

  return (
    <>
      {item && (
        <Helmet>
          <title>{item.title} — ZoneForty5</title>
          <meta name="description" content={item.description} />
          <meta property="og:title" content={`${item.title} — ZoneForty5`} />
          <meta property="og:description" content={item.description} />
          <meta property="og:type" content="article" />
          <meta property="og:url" content={`https://zoneforty5.tech/work/${item.slug}`} />
          {item.coverImageUrl && <meta property="og:image" content={item.coverImageUrl} />}
          <link rel="canonical" href={`https://zoneforty5.tech/work/${item.slug}`} />
        </Helmet>
      )}

      <PageLayout>
        <section className="band">
          <div className="container">
            {isLoading && <PortfolioDetailSkeleton />}

            {item && (
              <>
                <div className="row gap-2" style={{ alignItems: 'center', marginBottom: 28, color: '#6b6664' }}>
                  <Link to="/work" className="caption mono" style={{ color: '#bdbdbd' }}>Work</Link>
                  <span className="caption mono">/</span>
                  <span className="caption mono">{item.slug}</span>
                </div>

                <div className="col gap-5" style={{ maxWidth: 880, marginBottom: 40 }}>
                  <div className="row gap-3" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
                    <span className="eyebrow">{item.slug.replace(/-/g, ' ')}</span>
                    <span className="caption" style={{ color: '#3d3a39' }}>·</span>
                    <span className="caption mono">{new Date(item.createdAt).getFullYear()}</span>
                    <span className="pill pill-live mono" style={{ fontSize: 11, marginLeft: 'auto' }}>Live in production</span>
                  </div>
                  <h1 className="h1" style={{ textWrap: 'balance' } as React.CSSProperties}>{item.title}</h1>
                  <p className="lead">{item.description}</p>
                </div>

                {item.outcome && (
                  <div className="stat-grid" style={{ marginBottom: 56 }}>
                    {item.outcome.split('·').slice(0, 4).map((fact, i) => (
                      <div key={i} className="stat">
                        <span className="stat-num mono" style={{ fontSize: 18 }}>{fact.trim().split(' ')[0]}</span>
                        <span className="stat-label">{fact.trim().split(' ').slice(1).join(' ')}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{
                  aspectRatio: '16 / 8', background: '#0a0a0a',
                  border: '1px solid #3d3a39', borderRadius: 8, position: 'relative', overflow: 'hidden',
                  marginBottom: 64,
                }}>
                  <ProjectThumb kind="line" coverImageUrl={item.coverImageUrl} />
                  <div style={{ position: 'absolute', bottom: 14, left: 16 }}>
                    <span className="codechip" style={{ fontSize: 11 }}>{item.slug}</span>
                  </div>
                </div>

                <div className="g-2-narrow" style={{ marginBottom: 64 }}>
                  <div className="prose">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                      {item.body}
                    </ReactMarkdown>
                  </div>

                  <aside className="col gap-5">
                    <div className="card" style={{ padding: 22 }}>
                      <span className="caption" style={{ color: '#8b949e', letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: 600 }}>Stack</span>
                      <div className="row" style={{ flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                        {item.techStack.map(s => (
                          <span key={s} className="codechip" style={{ fontSize: 11 }}>{s}</span>
                        ))}
                      </div>
                    </div>

                    {item.projectUrl && (
                      <div className="card" style={{ padding: 22 }}>
                        <span className="caption" style={{ color: '#8b949e', letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: 600 }}>Live URL</span>
                        <a
                          href={item.projectUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mono small"
                          style={{ color: '#00d992', marginTop: 8, display: 'block', wordBreak: 'break-all' }}
                        >
                          {item.projectUrl}
                        </a>
                      </div>
                    )}

                    <div className="card card--featured" style={{ padding: 22 }}>
                      <span className="caption mono" style={{ color: '#00d992' }}>// interested?</span>
                      <p className="body" style={{ marginTop: 12, fontSize: 15, lineHeight: '23px' }}>
                        References available on request — every client is on the call.
                      </p>
                      <Link to="/contact" className="btn btn-primary btn-sm" style={{ marginTop: 16 }}>
                        Start a project →
                      </Link>
                    </div>
                  </aside>
                </div>

                <div className="hr-green" style={{ marginBottom: 48 }} />

                <div style={{
                  borderTop: '1px solid #3d3a39', paddingTop: 32,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  flexWrap: 'wrap', gap: 16,
                }}>
                  <Link to="/work" className="row gap-3" style={{ alignItems: 'center', color: '#bdbdbd' }}>
                    <Icon name="arrowLeft" size={16} />
                    <span className="small">All work</span>
                  </Link>
                </div>
              </>
            )}
          </div>
        </section>
      </PageLayout>
    </>
  )
}

function PortfolioDetailSkeleton() {
  return (
    <div className="col gap-6">
      <SkeletonBlock height={14} width={200} />
      <SkeletonBlock height={48} />
      <SkeletonBlock height={28} width="70%" />
      <SkeletonBlock height={300} borderRadius={8} />
      <div className="g-2-narrow">
        <div className="col gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonBlock key={i} height={18} />)}
        </div>
        <div className="col gap-4">
          <SkeletonBlock height={120} borderRadius={8} />
          <SkeletonBlock height={80} borderRadius={8} />
        </div>
      </div>
    </div>
  )
}
