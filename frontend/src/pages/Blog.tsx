import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import PageLayout from '@/components/ui/PageLayout'
import Icon from '@/components/ui/Icon'
import { SkeletonPostRow } from '@/components/ui/SkeletonBlock'
import { getPosts, getTags } from '@/lib/api'
import type { PostItem } from '@zf45/shared-types'

export default function Blog() {
  const [activeTag, setActiveTag] = useState('All')

  const { data: postsData, isLoading } = useQuery({
    queryKey: ['posts', activeTag],
    queryFn: () => getPosts(1, 100, activeTag === 'All' ? undefined : activeTag),
  })

  const { data: tagsData } = useQuery({
    queryKey: ['tags'],
    queryFn: getTags,
  })

  const posts = postsData?.data || []
  const tags = tagsData?.data || []
  const featured = posts[0]
  const rest = posts.slice(1)

  return (
    <>
      <Helmet>
        <title>Notes &amp; Case Studies — ZoneForty5</title>
        <meta name="description" content="Long-form post-mortems from real engagements, plus shorter notes on tooling and process." />
        <meta property="og:title" content="Notes & Case Studies — ZoneForty5" />
        <meta property="og:description" content="Long-form post-mortems from real engagements, plus shorter notes on tooling and process." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://zoneforty5.tech/notes" />
        <link rel="canonical" href="https://zoneforty5.tech/notes" />
      </Helmet>

      <PageLayout>
        <section className="band">
          <div className="container">
            <div className="section-head">
              <span className="eyebrow">Notes · case studies · runbooks</span>
              <h1 className="h1">What we learned, written down.</h1>
              <p className="lead">
                Long-form post-mortems from real engagements, plus shorter notes on tooling
                and process. New entries about once a month.
              </p>
            </div>

            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
              paddingBottom: 24, marginBottom: 32, borderBottom: '1px solid #3d3a39', flexWrap: 'wrap',
            }}>
              <div className="row gap-2" style={{ alignItems: 'center' }}>
                <Icon name="filter" size={16} color="#8b949e" />
                <span className="caption" style={{ color: '#8b949e', letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: 600 }}>Filter by tag</span>
              </div>
              <div className="chips">
                <button className={`chip${activeTag === 'All' ? ' active' : ''}`} onClick={() => setActiveTag('All')}>All</button>
                {tags.map(t => (
                  <button
                    key={t.slug}
                    className={`chip${activeTag === t.slug ? ' active' : ''}`}
                    onClick={() => setActiveTag(t.slug)}
                  >
                    #{t.name}
                  </button>
                ))}
              </div>
            </div>

            {isLoading && (
              <div>
                {Array.from({ length: 5 }).map((_, i) => <SkeletonPostRow key={i} />)}
              </div>
            )}

            {!isLoading && featured && (
              <Link to={`/notes/${featured.slug}`} style={{ textDecoration: 'none', display: 'block', marginBottom: 32 }}>
                <article className="card card--featured" style={{ padding: 40 }}>
                  <div className="row gap-3" style={{ alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
                    <span className="pill pill-live mono" style={{ fontSize: 11 }}>Featured · most-read</span>
                    <span className="caption mono" style={{ color: '#8b949e' }}>
                      {formatDate(featured.publishedAt)} · {estimateReadTime(featured.excerpt)}
                    </span>
                  </div>
                  <h2 className="h2" style={{ fontSize: 36, marginBottom: 16, textWrap: 'balance', lineHeight: '44px' } as React.CSSProperties}>
                    {featured.title}
                  </h2>
                  <p className="lead" style={{ marginBottom: 20 }}>{featured.excerpt}</p>
                  <div className="row gap-2" style={{ flexWrap: 'wrap' }}>
                    {featured.tags.map(t => (
                      <span key={t.slug} className="chip-static">#{t.name}</span>
                    ))}
                  </div>
                </article>
              </Link>
            )}

            {!isLoading && (
              <div>
                {rest.map((p, i) => <PostRow key={p.id} post={p} index={i} />)}
                <div className="hr-solid" />
              </div>
            )}

            {!isLoading && posts.length === 0 && (
              <div style={{ padding: 64, textAlign: 'center', color: '#6b6664', border: '1px dashed #3d3a39', borderRadius: 8 }}>
                <div className="mono" style={{ fontSize: 13 }}>// no posts found</div>
              </div>
            )}
          </div>
        </section>
      </PageLayout>
    </>
  )
}

function PostRow({ post }: { post: PostItem; index: number }) {
  return (
    <Link to={`/notes/${post.slug}`} style={{ textDecoration: 'none', display: 'block' }}>
      <article className="post">
        <div>
          <div className="post-date">{formatDate(post.publishedAt)}</div>
          <div className="caption" style={{ color: '#6b6664', marginTop: 2 }}>
            {estimateReadTime(post.excerpt)} read
          </div>
        </div>
        <div>
          <h3 className="post-title">{post.title}</h3>
          <p className="post-excerpt">{post.excerpt}</p>
          <div className="post-tags">
            {post.tags.map(t => (
              <span key={t.slug} className="chip-static">#{t.name}</span>
            ))}
          </div>
        </div>
        <div style={{ alignSelf: 'center', color: '#6b6664' }}>
          <Icon name="arrow" size={18} />
        </div>
      </article>
    </Link>
  )
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Draft'
  return new Date(dateStr).toISOString().slice(0, 10)
}

function estimateReadTime(text: string): string {
  const words = text.split(' ').length
  const mins = Math.max(1, Math.ceil(words / 200))
  return `${mins} min`
}
