import { Link } from 'react-router-dom'
import { Wordmark } from './Logomark'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <Wordmark />
            <p className="body" style={{ marginTop: 16, fontSize: 14, lineHeight: '22px', maxWidth: 320 }}>
              A one-person engineering studio. Full-stack web, IoT, and mobile systems shipped to production.
            </p>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <span className="pill pill-live mono" style={{ fontSize: 11 }}>Booking Q3 2026</span>
            </div>
          </div>

          <div className="footer-col">
            <div className="footer-col-title">Studio</div>
            <Link to="/about">About</Link>
            <Link to="/work">Selected work</Link>
            <Link to="/contact">Contact</Link>
            <Link to="/notes">Notes &amp; case studies</Link>
          </div>

          <div className="footer-col">
            <div className="footer-col-title">Practice</div>
            <Link to="/work">Full-stack web</Link>
            <Link to="/work">IoT &amp; embedded</Link>
            <Link to="/work">Mobile (iOS / Android)</Link>
            <Link to="/about">Agent-assisted delivery</Link>
          </div>

          <div className="footer-col">
            <div className="footer-col-title">Contact</div>
            <a href="mailto:hi@zoneforty5.tech">hi@zoneforty5.tech</a>
            <a href="https://github.com/janak-dev2002" target="_blank" rel="noopener noreferrer">GitHub · /janak-dev2002</a>
          </div>
        </div>

        <div className="footer-bottom">
          <span className="mono">© 2022–2026 ZoneForty5 · Built &amp; hosted by hand</span>
          <span className="mono" style={{ color: '#6b6664' }}>zoneforty5.tech</span>
        </div>
      </div>
    </footer>
  )
}
