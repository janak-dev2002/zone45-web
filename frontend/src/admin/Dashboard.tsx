import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import Icon from '@/components/ui/Icon'
import { adminGetPortfolio, adminGetPosts, adminGetContacts } from '@/lib/api'

export default function AdminDashboard() {
  const { data: portfolio } = useQuery({ queryKey: ['admin', 'portfolio'], queryFn: () => adminGetPortfolio(1, 100) })
  const { data: posts } = useQuery({ queryKey: ['admin', 'posts'], queryFn: () => adminGetPosts(1, 100) })
  const { data: contacts } = useQuery({ queryKey: ['admin', 'contacts'], queryFn: () => adminGetContacts(1, 100) })

  const portfolioItems = portfolio?.data || []
  const postsItems = posts?.data || []
  const contactItems = contacts?.data || []

  return (
    <div>
      <div className="row gap-2" style={{ alignItems: 'center', marginBottom: 12, color: '#6b6664' }}>
        <span className="caption mono">admin</span>
        <span className="caption mono">/</span>
        <span className="caption mono" style={{ color: '#bdbdbd' }}>dashboard</span>
      </div>
      <h1 className="h2" style={{ fontSize: 26, marginBottom: 24 }}>Dashboard</h1>

      <div className="stat-grid" style={{ marginBottom: 32 }}>
        <div className="stat">
          <span className="stat-num">{portfolioItems.length}</span>
          <span className="stat-label">portfolio items</span>
          <span className="stat-delta">{portfolioItems.filter(p => p.published).length} live</span>
        </div>
        <div className="stat">
          <span className="stat-num">{postsItems.length}</span>
          <span className="stat-label">blog posts</span>
          <span className="stat-delta">{postsItems.filter(p => p.published).length} published</span>
        </div>
        <div className="stat">
          <span className="stat-num">{contactItems.length}</span>
          <span className="stat-label">contact submissions</span>
          <span className="stat-delta">{contactItems.filter(c => c.status === 'received').length} unread</span>
        </div>
        <div className="stat">
          <span className="stat-num">{portfolioItems.filter(p => !p.published).length + postsItems.filter(p => !p.published).length}</span>
          <span className="stat-label">drafts</span>
          <span className="stat-delta">total</span>
        </div>
      </div>

      <div className="g-3">
        <Link to="/admin/portfolio" style={{ textDecoration: 'none' }}>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Icon name="layers" size={24} color="#00d992" />
            <h3 className="h4">Portfolio</h3>
            <p className="small">{portfolioItems.length} projects · {portfolioItems.filter(p => p.published).length} live</p>
          </div>
        </Link>
        <Link to="/admin/posts" style={{ textDecoration: 'none' }}>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Icon name="pen" size={24} color="#00d992" />
            <h3 className="h4">Posts</h3>
            <p className="small">{postsItems.length} posts · {postsItems.filter(p => p.published).length} published</p>
          </div>
        </Link>
        <Link to="/admin/contact" style={{ textDecoration: 'none' }}>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Icon name="mail" size={24} color="#00d992" />
            <h3 className="h4">Contacts</h3>
            <p className="small">{contactItems.length} submissions</p>
          </div>
        </Link>
      </div>
    </div>
  )
}
