import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import PageLayout from '@/components/ui/PageLayout'
import Icon from '@/components/ui/Icon'

export default function Landing() {
  return (
    <>
      <Helmet>
        <title>ZoneForty5 — Full-stack web, IoT &amp; mobile studio</title>
        <meta name="description" content="ZoneForty5 is a one-person engineering studio delivering full-stack web, IoT, and mobile systems to production. Fixed-fee, weekly demos, full handover." />
        <meta property="og:title" content="ZoneForty5 — Full-stack web, IoT & mobile studio" />
        <meta property="og:description" content="A one-person engineering studio. Full-stack web, IoT, and mobile systems shipped to production." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://zoneforty5.tech" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="ZoneForty5 — Full-stack web, IoT & mobile studio" />
        <meta name="twitter:description" content="A one-person engineering studio. Fixed-fee, weekly demos, full handover." />
        <link rel="canonical" href="https://zoneforty5.tech" />
      </Helmet>

      <PageLayout>
        <LandingHero />
        <div className="container"><div className="hr-dashed" /></div>
        <Services />
        <div className="container"><div className="hr-dashed" /></div>
        <Stack />
        <div className="container"><div className="hr-dashed" /></div>
        <Why />
        <CtaBand />
      </PageLayout>
    </>
  )
}

function LandingHero() {
  return (
    <section className="band" style={{ paddingTop: 80 }}>
      <div className="container">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 40 }}>
          <div className="col gap-6">
            <span className="eyebrow">A solo tech studio · since 2022</span>
            <h1 className="h1" style={{ textWrap: 'balance', maxWidth: 880 }}>
              Full-stack web, IoT, mobile. One studio, built to ship.
            </h1>
            <p className="lead" style={{ maxWidth: 640 }}>
              ZoneForty5 is a one-person engineering practice. We work with founders and product teams
              who need a real system on the other side of a deadline — not a deck, not a workshop, a system.
            </p>
            <div className="row gap-3" style={{ flexWrap: 'wrap', marginTop: 4 }}>
              <Link className="btn btn-primary" to="/contact">Start a project →</Link>
              <Link className="btn btn-outline" to="/work">See the work</Link>
            </div>
          </div>

          <HeroTerminal />
          <HeroStats />
        </div>
      </div>
    </section>
  )
}

function HeroTerminal() {
  return (
    <div className="code-block" style={{ maxWidth: 760 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div className="row gap-2" style={{ alignItems: 'center' }}>
          {[0, 1, 2].map(i => (
            <span key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: '#3d3a39', display: 'block' }} />
          ))}
          <span className="caption mono" style={{ marginLeft: 8 }}>~/zoneforty5/intake</span>
        </div>
        <span className="codechip" style={{ fontSize: 11 }}>main</span>
      </div>
      <div className="mono" style={{ fontSize: 13, lineHeight: '22px' }}>
        <div><span className="term-prompt">$</span> <span className="term-cmd">cat</span> intake.md</div>
        <div style={{ color: '#8b949e', marginTop: 4 }}>→ scope, stack, timeline, fixed-fee quote in &lt; 48h</div>
        <div style={{ marginTop: 10 }}><span className="term-prompt">$</span> <span className="term-cmd">git</span> log --oneline --since=2022-01</div>
        <div style={{ color: '#bdbdbd' }}>a1f3d2e (HEAD → main) Shipped Northbridge fleet v2</div>
        <div style={{ color: '#bdbdbd' }}>9b07c11 Stockwell iPad app to TestFlight</div>
        <div style={{ color: '#bdbdbd' }}>4e2af80 Faulkner billing portal cutover</div>
        <div style={{ color: '#6b6664' }}>... 11 more</div>
      </div>
    </div>
  )
}

function HeroStats() {
  const stats: [string, string][] = [
    ['14', 'Production systems'],
    ['100%', 'Still in production'],
    ['6w', 'Median PRD → prod'],
    ['1', 'Person, full stack'],
  ]
  return (
    <div className="stat-grid">
      {stats.map(([n, l], i) => (
        <div className="stat" key={i}>
          <span className="stat-num">{n}</span>
          <span className="stat-label">{l}</span>
        </div>
      ))}
    </div>
  )
}

const SERVICES = [
  {
    icon: 'layers' as const,
    eyebrow: '01',
    title: 'Full-stack web',
    body: 'TypeScript front to back. Next.js, Postgres, edge caching, Stripe, auth. Real production hosting, not Vercel-by-default.',
    bullets: ['Next.js / Remix / SvelteKit', 'Postgres + Drizzle / Prisma', 'Stripe billing & subscriptions'],
  },
  {
    icon: 'cpu' as const,
    eyebrow: '02',
    title: 'IoT & embedded',
    body: 'Microcontroller firmware, telemetry pipelines, and the dashboards on top. ESP32, RP2040, Pi, MQTT, InfluxDB, Grafana.',
    bullets: ['ESP32 / RP2040 firmware', 'MQTT + InfluxDB pipelines', 'Fleet dashboards & OTA'],
  },
  {
    icon: 'smart' as const,
    eyebrow: '03',
    title: 'Mobile (iOS / Android)',
    body: 'React Native and native Swift for things RN can\'t reach. App Store / Play Store review experience, MDM deployment.',
    bullets: ['React Native + Expo EAS', 'Native Swift modules', 'TestFlight & MDM rollout'],
  },
]

function Services() {
  return (
    <section id="services" className="band">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">What we build</span>
          <h2 className="h2">Three practices. One person. No agency tax.</h2>
          <p className="lead">
            Each practice has a portfolio behind it. The same engineer takes the call,
            writes the spec, ships the system, and answers the pager at 3am.
          </p>
        </div>
        <div className="g-3">
          {SERVICES.map((s, i) => (
            <article key={i} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div className="row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 8,
                  background: 'rgba(0,217,146,0.08)', border: '1px solid rgba(0,217,146,0.25)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon name={s.icon} size={20} color="#00d992" />
                </div>
                <span className="mono caption" style={{ color: '#6b6664' }}>{s.eyebrow}</span>
              </div>
              <h3 className="h3" style={{ textWrap: 'balance' } as React.CSSProperties}>{s.title}</h3>
              <p className="body" style={{ fontSize: 15 }}>{s.body}</p>
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4, borderTop: '1px solid #3d3a39', paddingTop: 16 }}>
                {s.bullets.map((b, j) => (
                  <li key={j} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ color: '#00d992', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>→</span>
                    <span className="small" style={{ color: '#bdbdbd' }}>{b}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

const STACK_GROUPS = [
  {
    title: 'Frontend',
    items: [['TypeScript', 'lang'], ['React', 'ui'], ['Next.js', 'framework'], ['Remix', 'framework'], ['Tailwind', 'css'], ['TanStack', 'data']],
  },
  {
    title: 'Backend',
    items: [['Node.js', 'runtime'], ['Postgres', 'db'], ['Drizzle', 'orm'], ['Redis', 'cache'], ['tRPC', 'api'], ['Stripe', 'billing']],
  },
  {
    title: 'Infra',
    items: [['Fly.io', 'host'], ['Cloudflare', 'edge'], ['Docker', 'containers'], ['Terraform', 'iac'], ['Grafana', 'obs'], ['GitHub Actions', 'ci']],
  },
  {
    title: 'Hardware & mobile',
    items: [['ESP32', 'mcu'], ['RP2040', 'mcu'], ['MQTT', 'protocol'], ['InfluxDB', 'tsdb'], ['React Native', 'mobile'], ['Swift', 'ios']],
  },
]

function Stack() {
  return (
    <section id="stack" className="band">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">The stack</span>
          <h2 className="h2">Picked because it ships. Not because it's new.</h2>
          <p className="lead">
            Boring technology, kept boring. Every choice below has at least one
            production system behind it, running today.
          </p>
        </div>
        <div className="g-2" style={{ gap: 32 }}>
          {STACK_GROUPS.map((g, i) => (
            <div key={i}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14, paddingBottom: 10, borderBottom: '1px dashed rgba(79,93,117,0.4)' }}>
                <span className="body-strong" style={{ color: '#f2f2f2' }}>{g.title}</span>
                <span className="caption mono" style={{ color: '#6b6664' }}>0{i + 1} / 04</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {g.items.map(([name, kind], j) => (
                  <div className="tile" key={j}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00d992', flexShrink: 0 }} />
                    <span className="tile-name">{name}</span>
                    <span className="tile-kind">{kind}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

const WHY_REASONS = [
  {
    num: '01',
    title: 'One throat to choke. Then unchoke.',
    body: 'No account manager between you and the code. The person who writes the contract is the person who pushes to main. Pager rotates back to the same person.',
    tag: 'ownership',
  },
  {
    num: '02',
    title: 'Fixed scope, fixed price, weekly demos.',
    body: 'Quote inside 48h of intake. Demo every Friday. Anything outside scope becomes its own line item with its own quote. No surprises on the invoice.',
    tag: 'billing',
  },
  {
    num: '03',
    title: 'Agent-assisted, human-shipped.',
    body: 'A team of LLM agents (codegen, review, ops) handles toil and parallelism. A human reviews every line that ships. You hire a person, not a model.',
    tag: 'workflow',
  },
  {
    num: '04',
    title: 'You own everything on day one.',
    body: 'Source, infra, domain, secrets — handed over in escrow before kickoff, transferred on completion. We can\'t hold your business hostage and we won\'t.',
    tag: 'handover',
  },
]

function Why() {
  return (
    <section id="why" className="band">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">Why ZoneForty5</span>
          <h2 className="h2">Four reasons. Each one is a contract clause.</h2>
        </div>
        <div>
          {WHY_REASONS.map((r, i) => (
            <div className="reason" key={i}>
              <span className="mono" style={{ color: '#00d992', fontSize: 14, letterSpacing: 1, paddingTop: 4 }}>{r.num}</span>
              <div>
                <h3 className="h3" style={{ fontSize: 24, marginBottom: 8 }}>{r.title}</h3>
                <p className="body" style={{ fontSize: 15 }}>{r.body}</p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 4 }}>
                <span className="chip-static green">#{r.tag}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function CtaBand() {
  return (
    <section
      className="band-tight"
      style={{ background: '#0a0a0a', borderTop: '1px solid #3d3a39', borderBottom: '1px solid #3d3a39' }}
    >
      <div
        className="container"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}
      >
        <div className="col gap-3" style={{ maxWidth: 640 }}>
          <span className="eyebrow">Next slot</span>
          <h3 className="h3" style={{ fontSize: 28 }}>
            Booking 1 project for Q3 2026. Intake closes August 14.
          </h3>
        </div>
        <div className="row gap-3" style={{ flexWrap: 'wrap' }}>
          <Link className="btn btn-primary" to="/contact">Start a project →</Link>
          <a className="btn btn-outline" href="mailto:hi@zoneforty5.tech">hi@zoneforty5.tech</a>
        </div>
      </div>
    </section>
  )
}
