import { Helmet } from 'react-helmet-async'
import { Link, useParams, Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import remarkGfm from 'remark-gfm'
import PageLayout from '@/components/ui/PageLayout'
import Icon from '@/components/ui/Icon'
import SkeletonBlock from '@/components/ui/SkeletonBlock'
import { getPost, ZF45ApiError } from '@/lib/api'

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>()

  const { data, isLoading, error } = useQuery({
    queryKey: ['post', slug],
    queryFn: () => getPost(slug!),
    enabled: !!slug,
  })

  if (error instanceof ZF45ApiError && error.status === 404) {
    return <Navigate to="/notes" replace />
  }

  const post = data?.data

  return (
    <>
      {post && (
        <Helmet>
          <title>{post.title} — ZoneForty5</title>
          <meta name="description" content={post.excerpt} />
          <meta property="og:title" content={`${post.title} — ZoneForty5`} />
          <meta property="og:description" content={post.excerpt} />
          <meta property="og:type" content="article" />
          <meta property="og:url" content={`https://zoneforty5.tech/notes/${post.slug}`} />
          {post.coverImageUrl && <meta property="og:image" content={post.coverImageUrl} />}
          {post.publishedAt && <meta property="article:published_time" content={post.publishedAt} />}
          <meta name="twitter:card" content="summary_large_image" />
          <link rel="canonical" href={`https://zoneforty5.tech/notes/${post.slug}`} />
        </Helmet>
      )}

      <PageLayout>
        <article className="band">
          <div className="container" style={{ maxWidth: 880 }}>
            {isLoading && <BlogPostSkeleton />}

            {post && (
              <>
                <div className="row gap-2" style={{ alignItems: 'center', marginBottom: 28, color: '#6b6664' }}>
                  <Link to="/notes" className="caption mono" style={{ color: '#bdbdbd' }}>Notes</Link>
                  <span className="caption mono">/</span>
                  <span className="caption mono">{post.slug}</span>
                </div>

                <div className="col gap-5" style={{ marginBottom: 48 }}>
                  <div className="row gap-3" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
                    {post.tags.map(t => (
                      <span key={t.slug} className="chip-static">#{t.name}</span>
                    ))}
                    <span className="caption mono" style={{ color: '#8b949e', marginLeft: 'auto' }}>
                      {post.publishedAt ? new Date(post.publishedAt).toISOString().slice(0, 10) : 'Draft'}
                    </span>
                  </div>
                  <h1 className="h1" style={{ textWrap: 'balance' } as React.CSSProperties}>{post.title}</h1>
                  <p className="lead">{post.excerpt}</p>
                </div>

                {post.coverImageUrl && (
                  <div style={{ aspectRatio: '16 / 9', marginBottom: 48, borderRadius: 8, overflow: 'hidden', border: '1px solid #3d3a39' }}>
                    <img src={post.coverImageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                )}

                <div className="prose" style={{ maxWidth: '100%' }}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                    {post.body}
                  </ReactMarkdown>
                </div>

                <div style={{ borderTop: '1px solid #3d3a39', paddingTop: 48, marginTop: 64 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                    <Link to="/notes" className="row gap-3" style={{ alignItems: 'center', color: '#bdbdbd' }}>
                      <Icon name="arrowLeft" size={16} />
                      <span className="small">All notes</span>
                    </Link>
                    <Link to="/contact" className="btn btn-outline btn-sm">
                      Start a project →
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>
        </article>
      </PageLayout>
    </>
  )
}

function BlogPostSkeleton() {
  return (
    <div className="col gap-6">
      <SkeletonBlock height={14} width={200} />
      <SkeletonBlock height={48} />
      <SkeletonBlock height={28} width="80%" />
      <SkeletonBlock height={300} borderRadius={8} />
      {Array.from({ length: 8 }).map((_, i) => <SkeletonBlock key={i} height={18} width={i % 3 === 0 ? '70%' : '100%'} />)}
    </div>
  )
}
