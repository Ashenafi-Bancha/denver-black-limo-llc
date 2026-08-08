import { Link } from 'react-router-dom'
import { Calendar, Check, MessageSquare, Phone } from 'lucide-react'
import { useSiteSettings } from '../context/SiteSettingsContext'
import { DEFAULT_BUSINESS, telHref, type BusinessInfo } from '../content/defaults'

type CTABannerProps = {
  eyebrow?: string
  title?: string
  subtitle?: string
  showPhone?: boolean
  primaryLabel?: string
  primaryTo?: string
  secondaryLabel?: string
  secondaryTo?: string
  backgroundImage?: string
}

const highlights = [
  'Quick & easy booking',
  'Professional chauffeurs',
  'Flight tracking available',
  '24/7 customer support',
]

export function CTABanner({
  eyebrow = 'Ready to Ride?',
  title = 'Reserve Your Luxury Transportation Today',
  subtitle,
  showPhone = true,
  primaryLabel = 'BOOK NOW',
  primaryTo = '/book',
  secondaryLabel = 'REQUEST A QUOTE',
  secondaryTo = '/quote',
  backgroundImage =
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600&q=80',
}: CTABannerProps) {
  const { get } = useSiteSettings()
  const biz = { ...DEFAULT_BUSINESS, ...get<Partial<BusinessInfo>>('business', {}) }
  return (
    <section className="relative overflow-hidden border-y border-brand-gold/20">
      <img
        src={backgroundImage}
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-25"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-brand-black via-brand-black/95 to-brand-black/85" />

      <div className="relative mx-auto max-w-7xl px-4 py-14 md:px-6 md:py-16">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_auto_1fr] lg:gap-8">
          {/* Left — message */}
          <div>
            <p className="text-xs tracking-[0.3em] text-brand-gold-light">{eyebrow}</p>
            <h2 className="mt-3 font-display text-2xl font-semibold leading-snug text-white md:text-3xl">
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-3 text-sm text-white/65">{subtitle}</p>
            ) : (
              <ul className="mt-5 space-y-2">
                {highlights.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-white/70">
                    <Check className="h-4 w-4 shrink-0 text-brand-gold-light" strokeWidth={2} />
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Center — phone */}
          {showPhone && (
            <div className="flex justify-center">
              <div className="glow-border">
                <a
                  href={telHref(biz.phone)}
                  className="group flex flex-col items-center rounded-[calc(1rem-1.5px)] bg-brand-black px-6 py-3.5 text-center transition hover:bg-brand-charcoal"
                >
                  <Phone className="h-4 w-4 text-brand-gold-light transition group-hover:scale-110" />
                  <p className="mt-1.5 font-display text-lg tracking-wide text-brand-gold-light md:text-xl">
                    {biz.phone}
                  </p>
                  <p className="mt-0.5 text-[9px] tracking-[0.25em] text-white/50">
                    24/7 CUSTOMER SUPPORT
                  </p>
                </a>
              </div>
            </div>
          )}

          {/* Right — actions */}
          <div className="flex flex-col items-center gap-3 lg:items-end">
            <Link
              to={primaryTo}
              className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-gold-gradient px-8 text-[13px] font-bold tracking-[0.18em] sm:min-h-0 sm:max-w-xs sm:py-3.5 sm:text-xs sm:tracking-[0.2em] text-brand-black shadow-lg shadow-brand-gold/20 transition hover:brightness-110 sm:w-auto lg:w-full lg:max-w-none"
            >
              <Calendar className="h-4 w-4" />
              {primaryLabel}
            </Link>
            <Link
              to={secondaryTo}
              className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full border border-brand-gold/60 px-8 text-[13px] font-bold tracking-[0.2em] text-brand-gold-light transition hover:border-brand-gold hover:bg-brand-gold/10 sm:w-auto lg:w-full lg:max-w-none sm:min-h-0 sm:max-w-xs sm:py-3.5 sm:text-xs"
            >
              <MessageSquare className="h-4 w-4" />
              {secondaryLabel}
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
