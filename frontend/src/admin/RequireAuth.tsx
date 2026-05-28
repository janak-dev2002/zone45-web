import { Navigate, Outlet } from 'react-router-dom'
import { useMe } from '@/lib/hooks/useAuth'

export default function RequireAuth() {
  const { data, isLoading } = useMe()

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="mono caption" style={{ color: '#6b6664' }}>Verifying session…</span>
      </div>
    )
  }

  if (!data?.data) {
    return <Navigate to="/admin/login" replace />
  }

  return <Outlet />
}
