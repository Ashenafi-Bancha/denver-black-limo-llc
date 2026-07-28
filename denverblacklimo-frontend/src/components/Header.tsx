import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Calendar, ChevronDown, ChevronRight, Menu, Phone, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Logo } from './Logo'
import { useSiteSettings } from '../context/SiteSettingsContext'
import { DEFAULT_BUSINESS, telHref, defaultServices, type BusinessInfo } from '../content/defaults'
import type { Service } from '../data/services'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `whitespace-nowrap text-xs font-medium tracking-[0.2em] transition ${
    isActive ? 'text-brand-gold-light' : 'text-white/80 hover:text-brand-gold-light'
  }`

const NAV_LINKS: [string, string][] = [
  ['Home', '/'],
  ['Fleet', '/fleet'],
  ['Service Areas', '/service-areas'],
  ['About Us', '/about'],
  ['Contact', '/contact'],
]

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [servicesOpen, setServicesOpen] = useState(false)
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false)
  const { get } = useSiteSettings()
  const biz = { ...DEFAULT_BUSINESS, ...get<Partial<BusinessInfo>>('business', {}) }
  const services = get<Service[]>('services', defaultServices)

  // Lock background scroll while the drawer is open
  useEffect(() => {
    if (typeof document === 'undefined') return
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  const closeMobile = () => {
    setMobileOpen(false)
    setMobileServicesOpen(false)
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-white/5 bg-brand-black/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 md:px-6">
        <Logo />

        {/* Desktop nav */}
        <nav className="hidden items-center gap-4 xl:gap-6 lg:flex">
          <NavLink to="/" className={navLinkClass} end>
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
            href={telHref(biz.phone)}
            className="flex items-center gap-2 rounded-full border border-brand-gold/50 px-4 py-2 text-xs font-medium tracking-wide text-brand-gold-light transition hover:border-brand-gold hover:bg-brand-gold/10"
          >
            <Phone className="h-3.5 w-3.5" />
            {biz.phone}
          </a>
          <Link
            to="/book"
            className="flex items-center gap-2 rounded-full bg-gold-gradient px-5 py-2 text-xs font-semibold tracking-widest text-brand-black shadow-md shadow-brand-gold/20 transition hover:brightness-110"
          >
            <Calendar className="h-3.5 w-3.5" />
            BOOK NOW
          </Link>
        </div>

        {/* Mobile controls: persistent Book CTA + hamburger */}
        <div className="flex items-center gap-2 lg:hidden">
          <Link
            to="/book"
            className="flex h-9 items-center gap-1 rounded-full bg-gold-gradient px-3.5 text-[11px] font-bold tracking-wide text-brand-black transition active:scale-95 md:hidden"
          >
            <Calendar className="h-3.5 w-3.5" />
            BOOK
          </Link>
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-brand-gold/40 text-brand-gold-light transition active:scale-95"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            aria-expanded={mobileOpen}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>
      </header>

      {/* Mobile drawer — rendered outside <header> so its backdrop-blur doesn't trap the fixed drawer */}
      {mobileOpen && (
        <div className="lg:hidden">
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Close menu"
            onClick={closeMobile}
            style={{ animation: 'fade-in 0.25s ease' }}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
          />
          {/* Panel — mounted on open, slides in via CSS keyframes (reliable on mount) */}
          <div
            style={{ animation: 'drawer-in 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}
            className="fixed inset-y-0 right-0 z-50 flex w-[86%] max-w-sm flex-col border-l border-brand-gold/20 bg-brand-charcoal shadow-2xl"
          >
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <span className="font-display text-sm font-bold uppercase tracking-[0.2em] text-brand-gold">Menu</span>
                <button
                  type="button"
                  onClick={closeMobile}
                  aria-label="Close menu"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-white/10 text-white/70 transition active:scale-95"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto px-4 py-4">
                <ul className="flex flex-col gap-1">
                  {NAV_LINKS.slice(0, 1).map(([label, path]) => (
                    <MobileNavItem key={path} label={label} path={path} onClick={closeMobile} end />
                  ))}

                  {/* Services accordion */}
                  <li>
                    <button
                      type="button"
                      onClick={() => setMobileServicesOpen((v) => !v)}
                      className="flex min-h-12 w-full items-center justify-between rounded-lg px-4 py-3 text-[15px] font-medium tracking-wide text-white/90 transition hover:bg-white/5"
                      aria-expanded={mobileServicesOpen}
                    >
                      Services
                      <ChevronDown className={`h-4 w-4 text-brand-gold transition-transform ${mobileServicesOpen ? 'rotate-180' : ''}`} />
                    </button>
                    <AnimatePresence initial={false}>
                      {mobileServicesOpen && (
                        <motion.ul
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.22 }}
                          className="overflow-hidden pl-3"
                        >
                          {services.map((s) => (
                            <li key={s.slug}>
                              <Link
                                to={`/services/${s.slug}`}
                                onClick={closeMobile}
                                className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm text-white/70 transition hover:bg-white/5 hover:text-brand-gold-light"
                              >
                                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-brand-gold/50" />
                                {s.title}
                              </Link>
                            </li>
                          ))}
                          <li>
                            <Link
                              to="/services"
                              onClick={closeMobile}
                              className="block rounded-lg px-4 py-2.5 text-xs font-semibold tracking-widest text-brand-gold-light"
                            >
                              VIEW ALL SERVICES →
                            </Link>
                          </li>
                        </motion.ul>
                      )}
                    </AnimatePresence>
                  </li>

                  {NAV_LINKS.slice(1).map(([label, path]) => (
                    <MobileNavItem key={path} label={label} path={path} onClick={closeMobile} />
                  ))}
                </ul>
              </nav>

              {/* Footer CTAs */}
              <div className="space-y-3 border-t border-white/10 bg-brand-black/40 p-4">
                <Link
                  to="/book"
                  onClick={closeMobile}
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-gold-gradient text-sm font-bold uppercase tracking-widest text-brand-black transition active:scale-[0.98]"
                >
                  <Calendar className="h-4 w-4" /> Book Now
                </Link>
                <div className="grid grid-cols-2 gap-3">
                  <Link
                    to="/quote"
                    onClick={closeMobile}
                    className="flex min-h-12 items-center justify-center rounded-lg border border-brand-gold/50 text-xs font-semibold uppercase tracking-widest text-brand-gold-light transition active:scale-[0.98]"
                  >
                    Get a Quote
                  </Link>
                  <a
                    href={telHref(biz.phone)}
                    className="flex min-h-12 items-center justify-center gap-1.5 rounded-lg border border-white/15 text-xs font-semibold text-white transition active:scale-[0.98]"
                  >
                    <Phone className="h-4 w-4 text-brand-gold" /> Call
                  </a>
                </div>
                <p className="text-center text-xs text-white/40">{biz.phone} · Available 24/7</p>
              </div>
            </div>
        </div>
      )}
    </>
  )
}

function MobileNavItem({ label, path, onClick, end }: { label: string; path: string; onClick: () => void; end?: boolean }) {
  return (
    <li>
      <NavLink
        to={path}
        end={end}
        onClick={onClick}
        className={({ isActive }) =>
          `flex min-h-12 items-center rounded-lg px-4 py-3 text-[15px] font-medium tracking-wide transition ${
            isActive
              ? 'bg-brand-gold/10 text-brand-gold-light'
              : 'text-white/90 hover:bg-white/5 hover:text-brand-gold-light'
          }`
        }
      >
        {({ isActive }) => (
          <>
            <span className={`mr-3 h-5 w-0.5 rounded-full transition-colors ${isActive ? 'bg-brand-gold' : 'bg-transparent'}`} />
            {label}
          </>
        )}
      </NavLink>
    </li>
  )
}
