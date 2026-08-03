import { Outlet, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Header } from './Header'
import { Footer } from './Footer'
import { RouteSeo } from './Seo'
import { ScrollToTop } from './ScrollToTop'
import { ChatWidget } from './ChatWidget'

export function Layout() {
  const { pathname } = useLocation()
  return (
    <div className="flex min-h-screen flex-col bg-brand-black">
      <ScrollToTop />
      <RouteSeo />
      <Header />
      {/* Keyed by route so every navigation eases the new page in smoothly */}
      <motion.main
        key={pathname}
        className="flex-1"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <Outlet />
      </motion.main>
      <Footer />
      <ChatWidget />
    </div>
  )
}
