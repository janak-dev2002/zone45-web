import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Wordmark } from './Logomark'
import Icon from './Icon'

const NAV_LINKS = [
  { id: 'work',    label: 'Work',    href: '/work' },
  { id: 'notes',   label: 'Notes',   href: '/notes' },
  { id: 'about',   label: 'About',   href: '/about' },
  { id: 'contact', label: 'Contact', href: '/contact' },
]

export default function Nav() {
  const location = useLocation()
  const active = NAV_LINKS.find(l => location.pathname.startsWith(l.href))?.id || ''

  return (
    <nav className="nav">
      <div className="container nav-inner">
        <Link to="/" style={{ display: 'flex' }}>
          <Wordmark />
        </Link>
        <div className="nav-links">
          {NAV_LINKS.map(l => (
            <Link key={l.id} to={l.href} className={active === l.id ? 'active' : ''}>
              {l.label}
            </Link>
          ))}
        </div>
        <div className="nav-right">
          <span className="pill pill-live mono" style={{ fontSize: 12 }}>Booking Q3 2026</span>
          <Link className="btn btn-primary btn-sm" to="/contact">Start a project →</Link>
        </div>
      </div>
    </nav>
  )
}

export function MNav() {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const active = NAV_LINKS.find(l => location.pathname.startsWith(l.href))?.id || ''

  return (
    <>
      <nav className="mnav">
        <Link to="/" style={{ display: 'flex' }}>
          <Wordmark size={20} />
        </Link>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Link className="btn btn-primary btn-sm" to="/contact" style={{ height: 32, padding: '0 12px', fontSize: 13 }}>
            Start →
          </Link>
          <button className="mnav-burger" aria-label="Open menu" onClick={() => setOpen(true)}>
            <Icon name="menu" size={18} color="#f2f2f2" />
          </button>
        </div>
      </nav>

      {open && (
        <>
          <div className="mobile-menu-overlay" onClick={() => setOpen(false)} />
          <div className="mobile-menu">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <Wordmark size={20} />
              <button className="icon-btn" onClick={() => setOpen(false)} aria-label="Close menu">
                <Icon name="close" size={18} />
              </button>
            </div>
            {NAV_LINKS.map(l => (
              <Link
                key={l.id}
                to={l.href}
                onClick={() => setOpen(false)}
                style={{
                  display: 'block',
                  padding: '12px 0',
                  fontSize: 18,
                  color: active === l.id ? '#00d992' : '#f2f2f2',
                  borderBottom: '1px solid #3d3a39',
                }}
              >
                {l.label}
              </Link>
            ))}
            <Link
              to="/contact"
              onClick={() => setOpen(false)}
              className="btn btn-primary"
              style={{ marginTop: 24, width: '100%' }}
            >
              Start a project →
            </Link>
          </div>
        </>
      )}
    </>
  )
}
