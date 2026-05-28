import { Helmet } from 'react-helmet-async'
import PageLayout from '@/components/ui/PageLayout'
import Icon from '@/components/ui/Icon'

const TIMELINE = [
  ['2010 — 2012', 'BSc Computer Engineering, University of Moratuwa'],
  ['2012 — 2014', 'Embedded engineer, Tessera Robotics'],
  ['2014 — 2017', 'Senior engineer, Eddystone Health'],
  ['2017 — 2022', 'Platform lead, Ostara Logistics'],
  ['2022 — now', 'ZoneForty5 — independent'],
]

const AGENTS = [
  {
    name: 'codegen',
    title: 'Drafting agent',
    body: 'Writes first-pass implementations against the spec. Output goes onto a feature branch, never main. Constrained to project files only.',
    perms: ['read: repo', 'write: feature/*', 'no secrets'],
  },
  {
    name: 'review',
    title: 'Review agent',
    body: 'Audits every PR for style, security, and spec coverage. Flags anything outside scope. A human approves before any merge to main.',
    perms: ['read: repo', 'write: PR comments', 'no merge'],
  },
  {
    name: 'ops',
    title: 'Operations agent',
    body: 'Monitors deploys, watches metrics, opens runbooks when alarms fire. Cannot deploy. Cannot push code. Read-only on infra.',
    perms: ['read: metrics + logs', 'no deploy', 'no infra writes'],
  },
]

const MISSION_POINTS = [
  'We take exactly one project per quarter.',
  'We quote inside 48 hours of intake.',
  'We demo every Friday.',
  'We hand over source + infra in escrow on day one.',
  'We do not retain client IP, recordings, or secrets after handover.',
]

export default function About() {
  return (
    <>
      <Helmet>
        <title>About — ZoneForty5</title>
        <meta name="description" content="ZoneForty5 is a one-person engineering studio. One engineer, fourteen years, one operating manual." />
        <meta property="og:title" content="About — ZoneForty5" />
        <meta property="og:description" content="A one-person engineering studio. Fixed-fee, weekly demos, full handover." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://zoneforty5.tech/about" />
        <link rel="canonical" href="https://zoneforty5.tech/about" />
      </Helmet>

      <PageLayout>
        <section className="band">
          <div className="container">
            <div className="col gap-5" style={{ maxWidth: 880, marginBottom: 72 }}>
              <span className="eyebrow">About the studio</span>
              <h1 className="h1">One engineer. Fourteen years.<br />One operating manual.</h1>
              <p className="lead">
                ZoneForty5 is the working name for an engineering practice run by one person.
                The studio takes one client at a time, delivers a system on a fixed schedule, and runs the
                support rotation afterwards. There is no second employee. There is no roadmap to hire.
              </p>
            </div>

            <div className="g-2-narrow" style={{ marginBottom: 80 }}>
              <div className="col gap-5">
                <span className="eyebrow">Founder</span>
                <h2 className="h2" style={{ fontSize: 32 }}>
                  Janaka Sangeeth — engineer, sole proprietor.
                </h2>
                <p className="body">
                  Fourteen years in the field. Two of those at a four-person consultancy
                  that scaled itself out of existence. Three at a healthcare IoT startup. Five running an
                  in-house platform team for a logistics operator. The last four as ZoneForty5.
                </p>
                <p className="body">
                  The studio exists because the work I most enjoyed at every previous job
                  was the engineering itself. Account management, hiring, fundraising, pitch decks — those
                  are real skills, just not mine. Keeping the studio at exactly one person is a deliberate
                  choice, not a stage.
                </p>

                <div style={{ marginTop: 16, borderTop: '1px dashed rgba(79,93,117,0.4)', paddingTop: 24 }}>
                  <span className="caption" style={{ color: '#8b949e', letterSpacing: 1.4, textTransform: 'uppercase', fontWeight: 600 }}>Timeline</span>
                  <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {TIMELINE.map(([when, what]) => (
                      <div key={when} style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 16 }}>
                        <span className="mono caption" style={{ color: '#00d992' }}>{when}</span>
                        <span className="body" style={{ fontSize: 14 }}>{what}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <aside className="col gap-4">
                <div style={{
                  aspectRatio: '4 / 5', border: '1px solid #3d3a39', borderRadius: 8,
                  background: '#0a0a0a', position: 'relative', overflow: 'hidden',
                }}>
                  <FounderPortrait />
                  <div style={{ position: 'absolute', bottom: 16, left: 16 }}>
                    <span className="codechip" style={{ fontSize: 11 }}>janaka · he/him</span>
                  </div>
                  <div style={{ position: 'absolute', top: 16, right: 16 }}>
                    <span className="caption mono" style={{ color: '#6b6664' }}>// studio portrait</span>
                  </div>
                </div>
                <div className="card" style={{ padding: 22 }}>
                  <span className="caption" style={{ color: '#8b949e', letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: 600 }}>Based</span>
                  <div className="body-strong" style={{ marginTop: 8 }}>Colombo, Sri Lanka · UTC+5:30</div>
                  <span className="caption" style={{ color: '#8b949e', letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: 600, marginTop: 16, display: 'block' }}>Clients in</span>
                  <div className="body-strong" style={{ marginTop: 8 }}>EU, UK, US, Asia-Pacific</div>
                  <span className="caption" style={{ color: '#8b949e', letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: 600, marginTop: 16, display: 'block' }}>Languages</span>
                  <div className="body-strong" style={{ marginTop: 8 }}>English, Sinhala</div>
                </div>
              </aside>
            </div>

            <div className="hr-green" style={{ marginBottom: 48 }} />
            <div className="g-2" style={{ marginBottom: 80 }}>
              <div className="col gap-3">
                <span className="eyebrow">Mission</span>
                <h2 className="h2" style={{ fontSize: 32 }}>Build the system. Ship it. Hand it over.</h2>
              </div>
              <div className="col gap-4">
                <p className="body">
                  The studio exists to deliver complete production systems to teams who would
                  otherwise have to hire-and-fire a contractor agency. We charge a fixed fee, write a real
                  spec, demo every Friday, and hand over source + infrastructure on day one.
                </p>
                <p className="body">
                  The job is not finished at deploy. We run a twelve-month support SLA on
                  every system, with a published response window and a pager rotation of exactly one person.
                  If a system breaks at 3am, the engineer who built it answers the phone.
                </p>
                <ul style={{ listStyle: 'none', padding: 0, marginTop: 12 }}>
                  {MISSION_POINTS.map((point, i) => (
                    <li key={i} style={{
                      display: 'flex', gap: 12, padding: '10px 0',
                      borderTop: i === 0 ? '1px solid #3d3a39' : '1px dashed rgba(79,93,117,0.4)',
                    }}>
                      <Icon name="check" size={16} color="#00d992" />
                      <span className="small" style={{ color: '#f2f2f2' }}>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #3d3a39', paddingTop: 56 }}>
              <div className="section-head">
                <span className="eyebrow">How a one-person studio ships at agency speed</span>
                <h2 className="h2" style={{ fontSize: 36 }}>Agent-assisted. Human-shipped.</h2>
                <p className="lead">
                  The studio runs an internal team of LLM agents — one for codegen drafts,
                  one for code review, one for ops. They handle toil and parallelism. A human reviews and
                  signs every line that ships to a client repository.
                </p>
              </div>

              <div className="g-3">
                {AGENTS.map(a => (
                  <div key={a.name} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div className="row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
                      <span className="codechip">agent · {a.name}</span>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#00d992', boxShadow: '0 0 0 3px rgba(0,217,146,0.18)' }} />
                    </div>
                    <h3 className="h4">{a.title}</h3>
                    <p className="small" style={{ color: '#bdbdbd' }}>{a.body}</p>
                    <ul style={{ listStyle: 'none', padding: 0, marginTop: 'auto', paddingTop: 14, borderTop: '1px solid #3d3a39', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {a.perms.map(p => (
                        <li key={p} className="mono caption" style={{ color: '#8b949e' }}>· {p}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 32, padding: 24, background: '#0a0a0a', border: '1px solid #3d3a39', borderRadius: 8 }}>
                <div className="row gap-3" style={{ alignItems: 'flex-start' }}>
                  <Icon name="lock" size={18} color="#00d992" />
                  <div>
                    <span className="body-strong">Disclosure policy.</span>
                    <span className="small" style={{ color: '#bdbdbd', marginLeft: 6 }}>
                      Every engagement includes a written agent log. Every PR is tagged with whether the
                      initial draft came from an agent or a human, and which agent. You see the same
                      audit trail we do.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </PageLayout>
    </>
  )
}

function FounderPortrait() {
  return (
    <svg viewBox="0 0 320 400" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="bgFounder" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#1a1a1a" />
          <stop offset="100%" stopColor="#0a0a0a" />
        </linearGradient>
      </defs>
      <rect width="320" height="400" fill="url(#bgFounder)" />
      {Array.from({ length: 200 }).map((_, i) => (
        <circle key={i}
          cx={(i * 37) % 320} cy={(i * 53) % 400} r={(i % 3) * 0.4 + 0.4}
          fill="#3d3a39" opacity={((i % 7) + 1) / 20}
        />
      ))}
      <ellipse cx="160" cy="170" rx="60" ry="72" fill="#101010" stroke="#3d3a39" />
      <path d="M70 400 C 70 300, 110 250, 160 250 C 210 250, 250 300, 250 400 Z" fill="#101010" stroke="#3d3a39" />
      <rect x="0" y="0" width="40" height="2" fill="#00d992" />
      <rect x="0" y="0" width="2" height="40" fill="#00d992" />
    </svg>
  )
}
