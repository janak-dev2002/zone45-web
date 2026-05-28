import { lazy, Suspense } from 'react'
import { RouteObject } from 'react-router-dom'

import RootLayout from './components/RootLayout'
import Landing from './pages/Landing'
import Portfolio from './pages/Portfolio'
import PortfolioDetail from './pages/PortfolioDetail'
import Blog from './pages/Blog'
import BlogPost from './pages/BlogPost'
import About from './pages/About'
import Contact from './pages/Contact'
import NotFound from './pages/NotFound'

const AdminApp = lazy(() => import('./admin/AdminApp'))

function AdminFallback() {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span className="mono caption" style={{ color: '#6b6664' }}>Loading admin…</span>
    </div>
  )
}

export const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    children: [
      { path: '/', element: <Landing /> },
      { path: '/work', element: <Portfolio /> },
      { path: '/work/:slug', element: <PortfolioDetail /> },
      { path: '/notes', element: <Blog /> },
      { path: '/notes/:slug', element: <BlogPost /> },
      { path: '/about', element: <About /> },
      { path: '/contact', element: <Contact /> },
      {
        path: '/admin/*',
        element: (
          <Suspense fallback={<AdminFallback />}>
            <AdminApp />
          </Suspense>
        ),
      },
      { path: '*', element: <NotFound /> },
    ],
  },
]
