import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'
import { ArrowRight, Info, Phone, Sparkles, Users } from 'lucide-react'
import { CTABanner } from '../components/CTABanner'
import { ColoradoMap } from '../components/ColoradoMap'
import { ReviewsCarousel } from '../components/ReviewsCarousel'
import { ServiceIcon } from '../components/ServiceIcon'
import { aboutTrust, TrustRow } from '../components/TrustRow'
import { GoldButton, OutlineButton, SectionHeading } from '../components/ui'
import { homeCoverageList } from '../data/serviceAreas'
import { services } from '../data/services'
import { defaultPricing, type PricingContent } from '../data/pricing'
import { fleet as defaultFleetList, type FleetVehicle } from '../data/fleet'
import { VehicleImage, findVehicleFor } from '../components/VehicleImage'
import { posts as defaultPosts, type Post } from '../data/posts'
import { IMAGES } from '../config/images'

import { useSiteSettings } from '../context/SiteSettingsContext'
import {
  DEFAULT_ABOUT,
  DEFAULT_BUSINESS,
  telHref,
  type AboutContent,
  type BusinessInfo,
} from '../content/defaults'

/** Hero service tags — flow into centered rows under the brand lockup. */
const HERO_TAGS = [
  'DENVER METRO',
  'DIA',
  'RED ROCKS',
  'MOUNTAIN RESORTS',
  'CORPORATE TRAVEL',
  'WEDDINGS & EVENTS',
  'AND MORE',
]

/** Area-specific icon for each coverage item (design: no generic check marks). */
function coverageIcon(area: string): string {
  const a = area.toLowerCase()
  if (a.includes('airport') || a.includes('aviation')) return 'plane'
  if (a.includes('vail') || a.includes('aspen')) return 'snowflake'
  if (a.includes('foothills')) return 'trees'
  if (a.includes('boulder')) return 'tree-pine'
  if (a.includes('entertainment') || a.includes('sports')) return 'music'
  if (a.includes('long-distance')) return 'route'
  if (a.includes('mountain') || a.includes('springs')) return 'mountain'
  if (a.includes('south')) return 'home'
  if (a.includes('metro') || a.includes('denver')) return 'building'
  return 'map-pin'
}

const quickNav = [
  { title: 'About Us', desc: 'Our story & values', to: '/about', icon: Info },
  { title: 'Services', desc: `${services.length} premium categories`, to: '/services', icon: Sparkles },
  { title: 'Fleet', desc: 'Luxury vehicles', to: '/fleet', icon: Users },
  { title: 'Contact', desc: 'Speak with our team', to: '/contact', icon: Phone },
]

export function HomePage() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const { settings, get } = useSiteSettings()

  const heroData = settings.home_hero;
  const heroImages = heroData.images;
  const about = { ...DEFAULT_ABOUT, ...get<Partial<AboutContent>>('about', {}) }
  const biz = { ...DEFAULT_BUSINESS, ...get<Partial<BusinessInfo>>('business', {}) }
  const pricing = { ...defaultPricing, ...get<Partial<PricingContent>>('pricing', {}) }
  const posts = get<Post[]>('posts', defaultPosts)
  const fleetVehicles = get<FleetVehicle[]>('fleet', defaultFleetList)
  // Every vehicle we have a price for — the client wants the full fleet on the
  // homepage, not a sample. Still filtered, so a vehicle awaiting a rate is left
  // out rather than advertised with a blank price.
  const ratesWithPrices = pricing.rates.filter((r) => r.hourlyRate?.trim())

  useEffect(() => {
    if (heroImages.length < 2) return
    setCurrentImageIndex(0)
    const timer = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % heroImages.length)
    }, 3500)
    return () => clearInterval(timer)
  }, [heroImages.length])

  return (
    <>
      <section className="relative overflow-hidden bg-brand-black md:min-h-[74vh]">
        {/* Mobile: the slideshow leads the hero, edge to edge above the
            heading. object-contain keeps every photo entirely visible, and
            the bottom gradient melts the band into the black hero so image
            and heading read as one piece. */}
        <div className="relative w-full md:hidden">
          <div className="relative aspect-[16/10] w-full overflow-hidden bg-brand-black">
            <AnimatePresence initial={false}>
              <motion.img
                key={currentImageIndex}
                src={heroImages[currentImageIndex]}
                alt="Denver Black Limo luxury vehicle"
                className="absolute inset-0 h-full w-full object-contain"
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ duration: 1.1, ease: 'easeInOut' }}
                onError={(e) => {
                  const t = e.currentTarget
                  if (!t.dataset.fb) {
                    t.dataset.fb = '1'
                    t.src = IMAGES.hero1
                  }
                }}
              />
            </AnimatePresence>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-brand-black via-brand-black/60 to-transparent" />
          </div>
          {heroImages.length > 1 && (
            <div className="absolute inset-x-0 bottom-2 z-10 flex items-center justify-center gap-1.5">
              {heroImages.map((src, i) => (
                <button
                  key={src}
                  type="button"
                  aria-label={`Show photo ${i + 1}`}
                  onClick={() => setCurrentImageIndex(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === currentImageIndex ? 'w-5 bg-brand-gold-light' : 'w-1.5 bg-white/30'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Sliding photos as the full hero background — desktop only. On a
            phone this column is far taller than a landscape photo, so
            object-cover showed a cropped sliver under the text. Mobile gets
            the leading slider band above instead. */}
        <div className="absolute inset-0 hidden overflow-hidden bg-brand-black md:block">
          <AnimatePresence initial={false}>
            <motion.img
              key={currentImageIndex}
              src={heroImages[currentImageIndex]}
              alt="Denver Black Limo luxury vehicle"
              className="absolute inset-0 h-full w-full object-cover"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 1.1, ease: 'easeInOut' }}
              onError={(e) => {
                const t = e.currentTarget
                if (!t.dataset.fb) {
                  t.dataset.fb = '1'
                  t.src = IMAGES.hero1
                }
              }}
            />
          </AnimatePresence>
          <div className="absolute inset-0 bg-gradient-to-t from-brand-black via-brand-black/80 to-brand-black/45 md:bg-gradient-to-r md:from-brand-black md:via-brand-black/75 md:to-brand-black/25" />
        </div>

        {/* Brand lockup — per client design: logo landing above the hero text */}
        <div className="relative z-20 mx-auto flex w-full max-w-7xl flex-col items-start px-4 pb-6 pt-4 text-left md:min-h-[74vh] md:justify-center md:px-6 md:py-16">
          {/* Brand lockup — left-aligned on all screens */}
          <div className="flex flex-col items-start text-left md:w-fit">
          <motion.img
            src={IMAGES.logo}
            alt="Denver Black Limo LLC logo"
            className="h-24 w-24 rounded-full object-cover shadow-lg shadow-brand-gold/20 ring-2 ring-brand-gold/40 md:h-36 md:w-36"
            initial={{ opacity: 0, y: -16, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            onError={(e) => {
              if (!e.currentTarget.src.endsWith('/images/logo.webp')) {
                e.currentTarget.src = '/images/logo.webp'
              }
            }}
          />
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-4 font-display font-bold leading-none"
          >
            <span className="block bg-gradient-to-b from-white via-gray-100 to-gray-400 bg-clip-text text-[2.5rem] tracking-[0.05em] text-transparent md:text-8xl">
              DENVER
            </span>
            <span className="mt-1 block text-gold-gradient text-[1.45rem] tracking-[0.04em] md:text-6xl">
              BLACK LIMO, LLC
            </span>
          </motion.h1>
          {/* line — diamond — line divider */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="mt-4 flex w-64 items-center gap-2 md:w-[28rem]"
          >
            <span className="h-px flex-1 bg-brand-gold/60" />
            <span className="h-2 w-2 rotate-45 bg-brand-gold-light" />
            <span className="h-px flex-1 bg-brand-gold/60" />
          </motion.div>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-3 text-[11px] font-medium uppercase tracking-[0.22em] text-white md:text-lg md:tracking-[0.3em]"
          >
            {/* The one hero line the CMS drives. `uppercase` keeps the lockup
                looking the same whatever case it is typed in. */}
            {heroData.subheadline}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="mt-4 w-full text-[clamp(10px,3vw,13px)] font-semibold tracking-[0.04em] text-white/90 md:text-sm md:tracking-[0.08em]"
          >
            {/* Tags flow into centered rows so the block always stays balanced */}
            <p className="flex max-w-[96%] flex-wrap items-center justify-start gap-x-1.5 gap-y-1.5 md:max-w-none md:gap-x-2.5">
              {HERO_TAGS.map((tag, i) => (
                <span key={tag} className="whitespace-nowrap">
                  {tag}
                  {i < HERO_TAGS.length - 1 && (
                    <span className="ml-1.5 text-brand-gold-light md:ml-2.5">•</span>
                  )}
                </span>
              ))}
            </p>
          </motion.div>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            // Stacked full-width on phones, back to a row from `sm` up.
            className="mt-5 flex w-full flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center md:mt-8"
          >
            <GoldButton to="/book">BOOK NOW</GoldButton>
            <OutlineButton to="/quote">GET A QUOTE</OutlineButton>
            {/* Call button — desktop only, moving-light border, same size as its siblings */}
            <div className="glow-border glow-border-pill hidden md:block">
              <a
                href={telHref(biz.phone)}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-black px-8 py-3 text-xs font-bold tracking-[0.2em] text-brand-gold-light transition hover:bg-brand-charcoal"
              >
                <Phone className="h-4 w-4" />
                CALL US
              </a>
            </div>
            {/* Scroll indicator — two lines: label above, glowing mouse below.
                Mobile: centered a bit below the buttons; desktop: to their right. */}
            <div className="mt-1.5 flex w-full flex-col items-center gap-1 sm:ml-16 sm:mt-3 sm:w-auto sm:gap-2 lg:ml-24">
              <span className="scroll-text text-[9px] font-semibold tracking-[0.26em] text-brand-gold-light sm:text-[10px] sm:tracking-[0.3em]">
                SCROLL TO EXPLORE
              </span>
              <span className="relative flex items-center justify-center">
                <span className="scroll-halo" aria-hidden="true" />
                <span className="scroll-mouse" aria-hidden="true">
                  <span className="scroll-mouse-wheel" />
                </span>
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      <TrustRow items={aboutTrust} />

      <section className="border-b border-brand-gold/15 bg-brand-charcoal">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 py-10 sm:grid-cols-2 md:px-6 md:py-12 lg:gap-5">
          {quickNav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="group flex items-center gap-4 rounded-xl border border-brand-gold/25 bg-brand-surface/30 p-5 transition duration-300 hover:-translate-y-0.5 hover:border-brand-gold/60 hover:bg-brand-surface hover:shadow-lg hover:shadow-brand-gold/10 md:p-6"
            >
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-brand-gold/50 text-brand-gold-light transition duration-300 group-hover:scale-110 group-hover:border-brand-gold group-hover:bg-brand-gold/15">
                <item.icon className="h-6 w-6" strokeWidth={1.5} />
              </span>
              <span className="min-w-0 flex-1">
                <h2 className="font-display text-lg tracking-wide text-white transition-colors duration-300 group-hover:text-brand-gold-light">
                  {item.title.toUpperCase()}
                </h2>
                <p className="mt-1 text-sm leading-snug text-white/60">{item.desc}</p>
              </span>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-brand-gold/40 text-brand-gold-light transition duration-300 group-hover:translate-x-1 group-hover:border-brand-gold group-hover:bg-brand-gold/15">
                <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <motion.div
            className="group relative overflow-hidden rounded-xl border border-brand-gold/25 bg-brand-charcoal"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            {/* SVG map renders underneath as fallback; the real photo covers it once loaded */}
            <ColoradoMap />
            <img
              src="/images/coverage-map.jpeg"
              alt="Denver Black Limo statewide coverage"
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
            {/* Caption + description overlaid on the image */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-brand-black via-brand-black/70 to-transparent px-5 pb-4 pt-14">
              <p className="font-display text-sm tracking-widest text-brand-gold-light">
                STATEWIDE COVERAGE
              </p>
              <p className="mt-1 text-xs leading-relaxed text-white/75">
                From Denver Metro and the Front Range to mountain resorts, airports, and
                neighboring states — we come to you, anywhere in Colorado.
              </p>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="relative"
          >
            <p className="text-xs tracking-[0.3em] text-brand-gold-light">PROUDLY SERVING COLORADO</p>
            <h2 className="mt-3 font-display text-3xl text-white md:text-4xl">
              Wherever You Need To Go, We&apos;re Already There
            </h2>
            <p className="mt-4 text-white/65">
              From DIA and private FBO terminals to Vail, Boulder, and the Western Slope — Denver
              Black Limo delivers consistent luxury service across Colorado.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-2.5 sm:gap-3">
              {homeCoverageList.map((area) => (
                <motion.div
                  key={area}
                  className="flex items-center gap-2.5 text-xs leading-snug text-white/85 sm:gap-3 sm:text-sm"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + homeCoverageList.indexOf(area) * 0.1 }}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-brand-gold/40 text-brand-gold-light sm:h-9 sm:w-9">
                    <ServiceIcon name={coverageIcon(area)} className="h-4 w-4" />
                  </span>
                  {area}
                </motion.div>
              ))}
            </div>
            <div className="mt-8 flex justify-center">
              <OutlineButton to="/service-areas">VIEW ALL SERVICE AREAS</OutlineButton>
            </div>
          </motion.div>
        </div>
      </section>

      {/* About Us — image blends into the section like the hero treatments:
          top banner fading into text on mobile, right-side blend on desktop. */}
      <section className="relative overflow-hidden border-t border-brand-gold/15 bg-brand-charcoal">
        <div className="mx-auto max-w-7xl">
          <div className="grid items-stretch lg:grid-cols-2">
            {/* Image — TOP on mobile, RIGHT on desktop, gradient-blended */}
            <motion.div
              className="relative order-1 min-h-[280px] sm:min-h-[360px] lg:order-2 lg:min-h-[480px]"
              initial={{ opacity: 0, scale: 1.05 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            >
              <img
                src={about.heroImage}
                alt="Denver Black Limo — about us"
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover"
                onError={(e) => {
                  const t = e.currentTarget
                  if (t.dataset.fallback) return
                  t.dataset.fallback = '1'
                  t.src = IMAGES.hero2
                }}
              />
              {/* Smooth blend: bottom-fade on mobile, left-fade on desktop */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-brand-charcoal to-transparent to-[45%] lg:bg-gradient-to-r lg:from-brand-charcoal lg:to-transparent lg:to-[55%]" />
            </motion.div>

            {/* Text */}
            <motion.div
              className="order-2 flex flex-col justify-center px-4 pb-14 pt-2 md:px-6 lg:order-1 lg:py-20"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
            >
              <p className="text-xs tracking-[0.3em] text-brand-gold-light">ABOUT US</p>
              <h2 className="mt-3 font-display text-3xl text-white md:text-4xl">{about.title}</h2>
              <p className="mt-4 leading-relaxed text-white/65">{about.intro}</p>
              <p className="mt-3 text-sm leading-relaxed text-white/55">
                Established in {biz.founded} · Licensed &amp; insured · Professional chauffeurs ·
                Available 24/7
              </p>
              <div className="mt-8 flex justify-center">
                <OutlineButton to="/about">LEARN MORE ABOUT US</OutlineButton>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="border-y border-brand-gold/15 bg-brand-surface/40 py-16">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <SectionHeading className="mb-10">Main Service Categories</SectionHeading>
          <div className="grid gap-6 md:grid-cols-3">
            {services.slice(0, 3).map((s, index) => (
              <Link
                key={s.slug}
                to={`/services/${s.slug}`}
                className="premium-card group overflow-hidden"
              >
                <motion.div
                  className="aspect-[16/10] overflow-hidden"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1, ease: "easeOut" }}
                >
                  <img
                    src={`/images/services/service-banner-${s.number}.jpeg`}
                    alt={s.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    onError={(e) => {
                      const t = e.currentTarget
                      const step = t.dataset.step
                      if (!step) {
                        t.dataset.step = 'jpg'
                        t.src = `/images/services/service-banner-${s.number}.jpg`
                      } else if (step === 'jpg') {
                        t.dataset.step = 'stock'
                        t.src = s.heroImage
                      }
                    }}
                  />
                </motion.div>
                <div className="p-5">
                  <p className="text-xs text-brand-gold/80">{String(s.number).padStart(2, '0')}</p>
                  <h3 className="mt-1 font-display text-xl text-brand-gold-light">{s.title}</h3>
                  <p className="mt-2 line-clamp-4 text-sm leading-relaxed text-white/60">
                    {s.intro}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1 text-xs tracking-widest text-brand-gold-light">
                    LEARN MORE <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-10 text-center">
            <OutlineButton to="/services">{`VIEW ALL ${services.length} SERVICES`}</OutlineButton>
          </div>
        </div>
      </section>

      {/* Pricing glimpse — same preview-plus-View-More pattern as the sections above */}
      {ratesWithPrices.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-20">
          <SectionHeading className="mb-3">Transparent Hourly Rates</SectionHeading>
          <p className="mx-auto mb-10 max-w-2xl text-center text-sm text-white/65">
            Clear starting prices with no surge pricing — every quote is confirmed in writing before you ride.
          </p>
          {/* A grid so the seventh card starts the last row at the left, in line
              with the columns above it. The View-full-pricing button then fills
              the space that card leaves, which balances the row rather than
              letting it trail off. */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {ratesWithPrices.map((rate, index) => {
              // Each rate belongs to a vehicle in the fleet — borrow its photo and
              // description so the price has something to look at.
              const vehicle = findVehicleFor(rate.vehicle, fleetVehicles)
              return (
                <motion.div
                  key={rate.vehicle}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  // Stagger within a row, not across all seven, so cards far down
                  // the list do not sit waiting half a second after scrolling in.
                  transition={{ duration: 0.5, delay: (index % 3) * 0.08, ease: 'easeOut' }}
                >
                  <Link to="/pricing" className="premium-card group flex h-full flex-col overflow-hidden">
                    {vehicle && (
                      <div className="aspect-[16/10] overflow-hidden">
                        <VehicleImage
                          vehicle={vehicle}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                      </div>
                    )}
                    <div className="flex flex-1 flex-col p-6 text-center">
                      <h3 className="font-display text-xl font-bold text-white">{rate.vehicle}</h3>
                      <p className="mt-1 text-sm text-white/55">{rate.capacity}</p>
                      {vehicle?.description && (
                        <p className="mt-3 text-sm leading-relaxed text-white/60">{vehicle.description}</p>
                      )}
                      <p className="mt-4 font-display text-4xl text-white">
                        {pricing.currency}
                        {rate.hourlyRate}
                        <span className="text-base text-white/50"> /hr</span>
                      </p>
                      {/* The caveat travels with the number so the rate is never read
                          as the final price. Minimum stays gold and prominent; the fees
                          note sits quieter beside it. */}
                      {(rate.minimumHours || pricing.ratesFeesNote) && (
                        <p className="mt-1 text-xs uppercase tracking-widest text-brand-gold/80">
                          {rate.minimumHours && <>{rate.minimumHours} minimum</>}
                          {rate.minimumHours && pricing.ratesFeesNote && (
                            <span className="mx-1.5 text-white/30">·</span>
                          )}
                          {pricing.ratesFeesNote && (
                            <span className="normal-case tracking-normal text-white/45">
                              {pricing.ratesFeesNote}
                            </span>
                          )}
                        </p>
                      )}
                      <span className="mt-4 inline-flex items-center justify-center gap-1 text-xs tracking-widest text-brand-gold-light">
                        LEARN MORE <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                  </Link>
                </motion.div>
              )
            })}
            {/* Sits in the columns the last row leaves empty, so the button
                balances that row instead of the row trailing off. When the
                cards happen to fill a row exactly it wraps to its own line and
                centres, which is why the span is capped at the column count. */}
            <div
              className={`flex items-center justify-center ${
                ratesWithPrices.length % 3 === 1 ? 'lg:col-span-2' : ''
              } ${ratesWithPrices.length % 2 === 1 ? '' : 'sm:col-span-2'}`}
            >
              <OutlineButton to="/pricing">VIEW FULL PRICING</OutlineButton>
            </div>
          </div>
        </section>
      )}

      {/* Blog glimpse */}
      {posts.length > 0 && (
        <section className="border-y border-brand-gold/15 bg-brand-surface/40 py-16">
          <div className="mx-auto max-w-7xl px-4 md:px-6">
            <SectionHeading className="mb-3">Colorado Travel Guides</SectionHeading>
            <p className="mx-auto mb-10 max-w-2xl text-center text-sm text-white/65">
              Local advice on airport timing, mountain travel and event nights from the chauffeurs who drive them daily.
            </p>
            <div className="grid gap-6 md:grid-cols-3">
              {posts.slice(0, 3).map((post, index) => (
                <Link key={post.slug} to={`/blog/${post.slug}`} className="premium-card group overflow-hidden">
                  <motion.div
                    className="aspect-[16/10] overflow-hidden"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ duration: 0.5, delay: index * 0.08, ease: 'easeOut' }}
                  >
                    <img
                      src={post.image}
                      alt={post.title}
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  </motion.div>
                  <div className="p-5">
                    <p className="text-xs tracking-widest text-brand-gold/80">
                      {post.tag} · {post.readMinutes} MIN READ
                    </p>
                    <h3 className="mt-1 font-display text-xl text-brand-gold-light">{post.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-white/60">{post.excerpt}</p>
                    <span className="mt-4 inline-flex items-center gap-1 text-xs tracking-widest text-brand-gold-light">
                      READ ARTICLE <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
            <div className="mt-10 text-center">
              <OutlineButton to="/blog">VIEW ALL ARTICLES</OutlineButton>
            </div>
          </div>
        </section>
      )}

      <ReviewsCarousel />
      <CTABanner />
    </>
  )
}
