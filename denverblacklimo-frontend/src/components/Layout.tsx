import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { Footer } from './Footer'
import { RouteSeo } from './Seo'
import { ScrollToTop } from './ScrollToTop'
import { ChatWidget } from './ChatWidget'

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col bg-brand-black">
      <ScrollToTop />
      <RouteSeo />
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <ChatWidget />
    </div>
  )
}
