import { useMediaQuery } from '@/lib/hooks/useMediaQuery'
import Nav, { MNav } from './Nav'
import Footer from './Footer'

interface PageLayoutProps {
  children: React.ReactNode
  noFooter?: boolean
}

export default function PageLayout({ children, noFooter }: PageLayoutProps) {
  const isMobile = useMediaQuery('(max-width: 768px)')

  return (
    <>
      {isMobile ? <MNav /> : <Nav />}
      <main>{children}</main>
      {!noFooter && <Footer />}
    </>
  )
}
