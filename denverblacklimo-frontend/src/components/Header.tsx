import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Calendar, ChevronDown, Menu, Phone, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Logo } from './Logo'
import { PHONE, PHONE_HREF } from '../constants'
import { services } from '../data/services'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `whitespace-nowrap text-xs font-medium tracking-[0.2em] transition ${
    isActive ? 'text-brand-gold-light' : 'text-white/80 hover:text-brand-gold-light'
  }`

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [servicesOpen, setServicesOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-brand-black/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-6">
        <Logo />

        <nav className="hidden items-center gap-4 xl:gap-6 lg:flex">
          <NavLink to="/" className={navLinkClass}>
            HOME
          </NavLink>
          <div
            className="relative"
            onMouseEnter={() => setServicesOpen(true)}
            onMouseLeave={() => setServicesOpen(false)}
          >
            <button
              type="button"
              className="flex whitespace-nowrap items-center gap-1 text-xs font-medium tracking-[0.2em] text-white/80 transition hover:text-brand-gold-light"
            >
              SERVICES
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            <AnimatePresence>
              {servicesOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="absolute left-0 top-full z-50 mt-2 w-80 border border-brand-gold/20 bg-brand-charcoal p-2 shadow-2xl"
                >
                  {services.map((s) => (
                    <Link
                      key={s.slug}
                      to={`/services/${s.slug}`}
                      className="block border border-transparent px-3 py-2 text-sm text-white/85 transition hover:border-brand-gold/30 hover:bg-brand-surface hover:text-brand-gold-light"
                    >
                      {s.title}
                    </Link>
                  ))}
                  <Link
                    to="/services"
                    className="mt-1 block border-t border-white/10 px-3 py-2 text-xs tracking-widest text-brand-gold-light"
                  >
                    VIEW ALL SERVICES →
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <NavLink to="/fleet" className={navLinkClass}>
            FLEET
          </NavLink>
          <NavLink to="/service-areas" className={navLinkClass}>
            SERVICE AREAS
          </NavLink>
          <NavLink to="/about" className={navLinkClass}>
            ABOUT US
          </NavLink>
          <NavLink to="/contact" className={navLinkClass}>
            CONTACT
          </NavLink>
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <a
            href={PHONE_HREF}
            className="flex items-center gap-2 border border-brand-gold/50 px-3 py-2 text-xs font-medium tracking-wide text-brand-gold-light transition hover:border-brand-gold hover:bg-brand-gold/10"
          >
            <Phone className="h-3.5 w-3.5" />
            {PHONE}
          </a>
          <Link
            to="/book"
            className="flex items-center gap-2 bg-gold-gradient px-4 py-2 text-xs font-semibold tracking-widest text-brand-black transition hover:brightness-110"
          >
            <Calendar className="h-3.5 w-3.5" />
            BOOK NOW
          </Link>
        </div>

        <button
          type="button"
          className="inline-flex items-center justify-center border border-brand-gold/40 p-2 text-brand-gold-light lg:hidden"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-white/10 bg-brand-charcoal lg:hidden"
          >
            <nav className="flex flex-col gap-1 px-4 py-4">
              {[
                ['Home', '/'],
                ['Services', '/services'],
                ['Fleet', '/fleet'],
                ['Service Areas', '/service-areas'],
                ['About Us', '/about'],
                ['Contact', '/contact'],
                ['Book Now', '/book'],
                ['Request a Quote', '/quote'],
              ].map(([label, path]) => (
                <Link
                  key={path}
                  to={path}
                  onClick={() => setMobileOpen(false)}
                  className="border border-white/5 px-3 py-3 text-sm tracking-widest text-white/90"
                >
                  {label}
                </Link>
              ))}
              <a href={PHONE_HREF} className="mt-2 text-center text-brand-gold-light">
                {PHONE}
              </a>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
