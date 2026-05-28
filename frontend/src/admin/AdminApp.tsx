import { Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { HelmetProvider } from 'react-helmet-async'
import { queryClient } from '@/lib/queryClient'
import AdminLogin from './Login'
import AdminLayout from './Layout'
import PortfolioList from './portfolio/PortfolioList'
import PortfolioForm from './portfolio/PortfolioForm'
import PostsList from './posts/PostsList'
import PostForm from './posts/PostForm'
import ContactList from './contact/ContactList'
import ContactDetail from './contact/ContactDetail'
import RequireAuth from './RequireAuth'

export default function AdminApp() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <Routes>
          <Route path="login" element={<AdminLogin />} />
          <Route element={<RequireAuth />}>
            <Route element={<AdminLayout />}>
              <Route index element={<Navigate to="portfolio" replace />} />
              <Route path="portfolio" element={<PortfolioList />} />
              <Route path="portfolio/new" element={<PortfolioForm />} />
              <Route path="portfolio/:id" element={<PortfolioForm />} />
              <Route path="posts" element={<PostsList />} />
              <Route path="posts/new" element={<PostForm />} />
              <Route path="posts/:id" element={<PostForm />} />
              <Route path="contact" element={<ContactList />} />
              <Route path="contact/:id" element={<ContactDetail />} />
            </Route>
          </Route>
        </Routes>
      </QueryClientProvider>
    </HelmetProvider>
  )
}
