import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import PageLayout from '@/components/ui/PageLayout'

export default function NotFound() {
  return (
    <>
      <Helmet>
        <title>404 — ZoneForty5</title>
      </Helmet>
      <PageLayout>
        <section className="band">
          <div className="container" style={{ textAlign: 'center', paddingBlock: 96 }}>
            <span className="codechip" style={{ fontSize: 13, marginBottom: 24, display: 'inline-flex' }}>404</span>
            <h1 className="h1" style={{ marginBottom: 16 }}>Page not found.</h1>
            <p className="lead" style={{ marginBottom: 32, maxWidth: 480, marginInline: 'auto' }}>
              This path doesn't exist. It wasn't archived — it just never was.
            </p>
            <div className="row gap-3" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/" className="btn btn-primary">Back home →</Link>
              <Link to="/work" className="btn btn-outline">See the work</Link>
            </div>
          </div>
        </section>
      </PageLayout>
    </>
  )
}
