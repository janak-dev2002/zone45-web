import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { Wordmark } from '@/components/ui/Logomark'
import Icon from '@/components/ui/Icon'
import { useMe, useLogout } from '@/lib/hooks/useAuth'

const SIDEBAR_NAV = [
  { id: 'portfolio', label: 'Portfolio', icon: 'layers' as const, to: '/admin/portfolio' },
  { id: 'posts',     label: 'Posts',     icon: 'pen' as const,    to: '/admin/posts' },
  { id: 'contact',   label: 'Contact',   icon: 'mail' as const,   to: '/admin/contact' },
]

export default function AdminLayout() {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a' }}>
      <div className="admin">
        <AdminSidebar />
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', overflow: 'hidden' }}>
          <AdminTopbar />
          <main className="adm-main">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}

function AdminSidebar() {
  return (
    <aside className="adm-side">
      <div className="adm-side-head">
        <Wordmark size={20} />
        <span className="codechip" style={{ marginLeft: 'auto', fontSize: 10 }}>admin</span>
      </div>
      <nav className="adm-nav">
        <div className="adm-nav-section">Content</div>
        {SIDEBAR_NAV.map(l => (
          <NavLink
            key={l.id}
            to={l.to}
            className={({ isActive }) => isActive ? 'active' : ''}
          >
            <Icon name={l.icon} size={16} />
            <span style={{ flex: 1 }}>{l.label}</span>
          </NavLink>
        ))}
        <div className="adm-nav-section">Studio</div>
        <NavLink to="/" target="_blank" style={{ color: '#8b949e' }}>
          <Icon name="eye" size={16} />
          <span style={{ flex: 1 }}>View site</span>
        </NavLink>
      </nav>
      <AdminUserTile />
    </aside>
  )
}

function AdminUserTile() {
  const { data } = useMe()
  const logout = useLogout()
  const navigate = useNavigate()
  const user = data?.data
  const initials = user?.name?.split(' ').map((word: string) => word[0]).join('').toUpperCase().slice(0, 2) || 'ZF'

  async function handleLogout() {
    await logout.mutateAsync()
    navigate('/admin/login')
  }

  return (
    <div style={{ marginTop: 'auto', padding: '12px 16px', borderTop: '1px solid #3d3a39', display: 'flex', alignItems: 'center', gap: 10 }}>
      <div className="avatar" style={{ width: 30, height: 30, fontSize: 12, flexShrink: 0 }}>{initials}</div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div className="small" style={{ color: '#f2f2f2', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name || 'Admin'}</div>
        <div className="caption mono" style={{ color: '#6b6664', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</div>
      </div>
      <button className="icon-btn" onClick={handleLogout} aria-label="Sign out" title="Sign out">
        <Icon name="arrowLeft" size={14} color="#6b6664" />
      </button>
    </div>
  )
}

function AdminTopbar() {
  const [search, setSearch] = useState('')

  return (
    <header className="adm-top">
      <div className="row gap-3" style={{ alignItems: 'center' }}>
        <div style={{ position: 'relative' }}>
          <input
            className="field"
            placeholder="Search…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: 280, paddingLeft: 36, height: 36, fontSize: 13 }}
            aria-label="Search"
          />
          <div style={{ position: 'absolute', left: 12, top: 0, bottom: 0, display: 'flex', alignItems: 'center', color: '#6b6664' }}>
            <Icon name="search" size={14} />
          </div>
          <span className="kbd" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)' }}>⌘K</span>
        </div>
      </div>
      <div className="row gap-3" style={{ alignItems: 'center' }}>
        <span className="pill pill-live mono" style={{ fontSize: 11 }}>prod · all systems go</span>
      </div>
    </header>
  )
}

import { useState } from 'react'
