import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Calendar, ChevronDown, Menu, Phone, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Logo } from './Logo'
import { useSiteSettings } from '../context/SiteSettingsContext'
import {
  DEFAULT_BUSINESS,
  telHref,
  defaultServices,
  defaultServiceAreas,
  type BusinessInfo,
} from '../content/defaults'
import type { Service } from '../data/services'
import type { ServiceArea } from '../data/serviceAreas'
import { fleet as defaultFleet, type FleetVehicle } from '../data/fleet'

/**
 * The nav sets its own size rather than using `text-xs`, which the desktop type scale
 * lifts to 13px from 1024px up — enough extra width to push the bar onto two lines.
 * Tracking and size both step up at xl, where there is room for them.
 */
const navBaseClass =
  'flex items-center gap-1 whitespace-nowrap text-[11px] font-medium tracking-[0.04em] transition ' +
  'xl:text-[13px] xl:tracking-[0.16em]'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `${navBaseClass} ${isActive ? 'text-brand-gold-light' : 'text-white/80 hover:text-brand-gold-light'}`

/** Drawer links — flat on mobile: every item goes straight to its own page. */
const MOBILE_LINKS: [string, string][] = [
  ['Home', '/'],
  ['Services', '/services'],
  ['Fleet', '/fleet'],
  ['Pricing', '/pricing'],
  ['Service Areas', '/service-areas'],
  ['Reviews', '/reviews'],
  ['Blog', '/blog'],
  ['About Us', '/about'],
  ['Contact', '/contact'],
]

/** Secondary desktop pages, grouped under the click-to-open MORE menu. */
const MORE_LINKS: [string, string][] = [
  ['Reviews', '/reviews'],
  ['Blog', '/blog'],
]

const panelClass =
  'absolute top-full z-50 mt-2 rounded-xl border border-brand-gold/20 bg-brand-charcoal p-2 shadow-2xl'
const panelItemClass =
  'block border border-transparent px-3 py-2 text-sm text-white/85 transition hover:border-brand-gold/30 hover:bg-brand-surface hover:text-brand-gold-light'
const panelFooterClass =
  'mt-1 block border-t border-white/10 px-3 py-2 text-xs tracking-widest text-brand-gold-light'
const panelMotion = {
  initial: { opacity: 0, y: 12, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 8, scale: 0.98 },
  transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const },
}

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [servicesOpen, setServicesOpen] = useState(false)
  const [fleetOpen, setFleetOpen] = useState(false)
  const [areasOpen, setAreasOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)
  const { pathname } = useLocation()
  const { get } = useSiteSettings()
  const biz = { ...DEFAULT_BUSINESS, ...get<Partial<BusinessInfo>>('business', {}) }
  const services = get<Service[]>('services', defaultServices)
  const areas = get<ServiceArea[]>('service_areas', defaultServiceAreas)
  const vehicles = get<FleetVehicle[]>('fleet', defaultFleet)

  // Lock background scroll while the drawer is open
  useEffect(() => {
    if (typeof document === 'undefined') return
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  // MORE opens on click, so it needs to close on outside click / Escape.
  useEffect(() => {
    if (!moreOpen || typeof document === 'undefined') return
    const onPointerDown = (e: MouseEvent) => {
      if (!moreRef.current?.contains(e.target as Node)) setMoreOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMoreOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [moreOpen])

  // Never leave a menu hanging open after a navigation.
  useEffect(() => setMoreOpen(false), [pathname])

  const closeMobile = () => setMobileOpen(false)

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-white/5 bg-brand-black/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 md:px-6">
        <Logo tagline={false} />

        {/* Desktop nav */}
        <nav className="hidden items-center gap-2 lg:flex xl:gap-4">
          <NavLink to="/" className={navLinkClass} end>
            HOME
          </NavLink>

          <HoverMenu label="SERVICES" open={servicesOpen} setOpen={setServicesOpen} width="w-80">
            {services.map((s) => (
              <Link key={s.slug} to={`/services/${s.slug}`} className={panelItemClass}>
                {s.title}
              </Link>
            ))}
            <Link to="/services" className={panelFooterClass}>
              VIEW ALL SERVICES →
            </Link>
          </HoverMenu>

          <HoverMenu label="FLEET" open={fleetOpen} setOpen={setFleetOpen} width="w-72">
            {vehicles.map((v) => (
              <Link key={v.id} to={`/fleet#${v.id}`} className={panelItemClass}>
                {v.name}
              </Link>
            ))}
            <Link to="/fleet" className={panelFooterClass}>
              VIEW FULL FLEET →
            </Link>
          </HoverMenu>

          <NavLink to="/pricing" className={navLinkClass}>
            PRICING
          </NavLink>

          <HoverMenu label="SERVICE AREAS" open={areasOpen} setOpen={setAreasOpen} width="w-80">
            {areas.map((a) => (
              <Link key={a.slug} to={`/service-areas/${a.slug}`} className={panelItemClass}>
                {a.title}
              </Link>
            ))}
            <Link to="/service-areas" className={panelFooterClass}>
              VIEW ALL SERVICE AREAS →
            </Link>
          </HoverMenu>

          <NavLink to="/about" className={navLinkClass}>
            ABOUT US
          </NavLink>
          <NavLink to="/contact" className={navLinkClass}>
            CONTACT
          </NavLink>

          {/* MORE — opens on hover, click still toggles for touch and keyboard */}
          <div
            className="relative"
            ref={moreRef}
            onMouseEnter={() => setMoreOpen(true)}
            onMouseLeave={() => setMoreOpen(false)}
          >
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              aria-expanded={moreOpen}
              aria-haspopup="true"
              className={`${navBaseClass} ${moreOpen ? 'text-brand-gold-light' : 'text-white/80 hover:text-brand-gold-light'}`}
            >
              MORE
              <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-300 ${moreOpen ? 'rotate-180' : ''}`} />
            </button>
            {moreOpen && <span aria-hidden="true" className="absolute left-0 top-full h-3 w-full" />}
            <AnimatePresence>
              {moreOpen && (
                <motion.div {...panelMotion} className={`${panelClass} right-0 w-52`}>
                  {MORE_LINKS.map(([label, path]) => (
                    <Link key={path} to={path} onClick={() => setMoreOpen(false)} className={panelItemClass}>
                      {label}
                    </Link>
                  ))}
                  <Link to="/quote" onClick={() => setMoreOpen(false)} className={panelFooterClass}>
                    GET A QUOTE →
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </nav>

        <div className="hidden shrink-0 flex-nowrap items-center gap-3 whitespace-nowrap md:flex">
          <a
            href={telHref(biz.phone)}
            className="flex items-center gap-2 whitespace-nowrap rounded-full border border-brand-gold/50 px-3 py-2 text-[11px] font-medium tracking-wide text-brand-gold-light transition hover:border-brand-gold hover:bg-brand-gold/10 xl:px-4 xl:text-xs"
          >
            <Phone className="h-3.5 w-3.5 shrink-0" />
            <span className="sr-only xl:not-sr-only">{biz.phone}</span>
          </a>
          <Link
            to="/book"
            className="flex items-center gap-2 whitespace-nowrap rounded-full bg-gold-gradient px-3.5 py-2 text-[11px] font-semibold tracking-wider text-brand-black shadow-md shadow-brand-gold/20 transition hover:brightness-110 xl:px-5 xl:text-xs xl:tracking-widest"
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

              {/* Flat list — every item navigates straight to its page, no accordions */}
              <nav className="flex-1 overflow-y-auto px-4 py-4">
                <ul className="flex flex-col gap-1">
                  {MOBILE_LINKS.map(([label, path]) => (
                    <MobileNavItem key={path} label={label} path={path} onClick={closeMobile} end={path === '/'} />
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

/** Desktop nav dropdown that opens on hover with the shared gold panel animation. */
function HoverMenu({
  label,
  open,
  setOpen,
  width,
  children,
}: {
  label: string
  open: boolean
  setOpen: (v: boolean) => void
  width: string
  children: React.ReactNode
}) {
  return (
    <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        className={`${navBaseClass} ${open ? 'text-brand-gold-light' : 'text-white/80 hover:text-brand-gold-light'}`}
      >
        {label}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>
      {/* Invisible bridge so the pointer can cross the gap into the panel without closing it */}
      {open && <span aria-hidden="true" className="absolute left-0 top-full h-3 w-full" />}
      <AnimatePresence>
        {open && (
          <motion.div {...panelMotion} className={`${panelClass} left-0 ${width}`}>
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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
