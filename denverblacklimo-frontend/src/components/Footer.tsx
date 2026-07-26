import { Link } from 'react-router-dom'
import { Logo } from './Logo'
import { useSiteSettings } from '../context/SiteSettingsContext'
import { DEFAULT_BUSINESS, telHref, mailHref, defaultServices, type BusinessInfo } from '../content/defaults'
import type { Service } from '../data/services'

export function Footer() {
  const { get } = useSiteSettings()
  const biz = { ...DEFAULT_BUSINESS, ...get<Partial<BusinessInfo>>('business', {}) }
  const services = get<Service[]>('services', defaultServices)
  return (
    <footer className="border-t border-white/10 bg-brand-charcoal">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-2 md:px-6 lg:grid-cols-4">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/60">
            Premium chauffeured transportation across Denver, Colorado, and beyond — built on
            professionalism, safety, and understated luxury.
          </p>
        </div>
        <div>
          <h3 className="mb-4 text-xs font-semibold tracking-[0.25em] text-brand-gold-light">
            QUICK LINKS
          </h3>
          <ul className="space-y-2 text-sm text-white/70">
            {[
              ['Home', '/'],
              ['About Us', '/about'],
              ['Fleet', '/fleet'],
              ['Service Areas', '/service-areas'],
              ['Contact', '/contact'],
              ['Book Now', '/book'],
            ].map(([label, path]) => (
              <li key={path}>
                <Link to={path} className="transition hover:text-brand-gold-light">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-4 text-xs font-semibold tracking-[0.25em] text-brand-gold-light">
            SERVICES
          </h3>
          <ul className="space-y-2 text-sm text-white/70">
            {services.slice(0, 6).map((s) => (
              <li key={s.slug}>
                <Link to={`/services/${s.slug}`} className="transition hover:text-brand-gold-light">
                  {s.title}
                </Link>
              </li>
            ))}
            <li>
              <Link to="/services" className="text-brand-gold-light">
                View all services →
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="mb-4 text-xs font-semibold tracking-[0.25em] text-brand-gold-light">
            CONTACT INFO
          </h3>
          <ul className="space-y-3 text-sm text-white/70">
            <li className="flex items-center gap-3">
              <svg className="h-4 w-4 text-brand-gold-light" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              <a href={telHref(biz.phone)} className="transition hover:text-brand-gold-light">
                {biz.phone}
              </a>
            </li>
            <li className="flex items-center gap-3">
              <svg className="h-4 w-4 text-brand-gold-light" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              <a href={mailHref(biz.email)} className="transition hover:text-brand-gold-light">
                {biz.email}
              </a>
            </li>
            <li className="flex items-center gap-3">
              <svg className="h-4 w-4 text-brand-gold-light" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
              </svg>
              <a href={biz.facebook} className="transition hover:text-brand-gold-light">
                Facebook
              </a>
            </li>
            <li className="flex items-center gap-3">
              <svg className="h-4 w-4 text-brand-gold-light" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {biz.address}
            </li>
          </ul>
          <div className="mt-6">
            <p className="mb-3 text-xs font-semibold tracking-[0.25em] text-brand-gold-light">
              FOLLOW US
            </p>
            <div className="flex gap-3">
              <a
                href={biz.facebook}
                aria-label="Facebook"
                className="group flex h-10 w-10 items-center justify-center rounded-full border border-[#1877F2]/40 bg-brand-surface text-brand-gold-light transition-all duration-300 hover:border-[#1877F2] hover:bg-[#1877F2]/10 hover:shadow-lg hover:shadow-[#1877F2]/25"
              >
                <svg className="h-4 w-4 transition-colors group-hover:text-[#1877F2]" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                  <path d="M14 13.5h2.5l1-4H14v-2c0-1.03 0-2 2-2h1.5V2.14c-.326-.043-1.557-.14-2.857-.14C11.928 2 10 3.657 10 6.7v2.8H7v4h3V22h4v-8.5z" />
                </svg>
              </a>
              <a
                href={`https://wa.me/1${biz.phone.replace(/\D/g, '')}`}
                aria-label="WhatsApp"
                className="group flex h-10 w-10 items-center justify-center rounded-full border border-[#25D366]/40 bg-brand-surface text-brand-gold-light transition-all duration-300 hover:border-[#25D366] hover:bg-[#25D366]/10 hover:shadow-lg hover:shadow-[#25D366]/25"
              >
                <svg className="h-5 w-5 transition-colors group-hover:text-[#25D366]" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
                </svg>
              </a>
              <a
                href="#"
                aria-label="X Twitter"
                className="group flex h-10 w-10 items-center justify-center rounded-full border border-white/40 bg-brand-surface text-brand-gold-light transition-all duration-300 hover:border-white hover:bg-white/10 hover:shadow-lg hover:shadow-white/25"
              >
                <svg className="h-4 w-4 transition-colors group-hover:text-white" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 py-5">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-4 text-center md:flex-row md:justify-between md:px-6">
          <p className="text-xs tracking-widest text-white/40">
            © {new Date().getFullYear()} Denver Black Limo LLC. All rights reserved.
          </p>
          <p className="text-xs tracking-[0.2em] text-brand-gold-light/80">
            Safety, Comfort, and Reliability. Your Journey Is Our Priority.
          </p>
        </div>
      </div>
    </footer>
  )
}
