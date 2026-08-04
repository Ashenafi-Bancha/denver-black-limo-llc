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
import { IMAGES } from '../config/images'

import { useSiteSettings } from '../context/SiteSettingsContext'
import {
  DEFAULT_ABOUT,
  DEFAULT_BUSINESS,
  telHref,
  type AboutContent,
  type BusinessInfo,
} from '../content/defaults'

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
      <section className="relative overflow-hidden md:min-h-[74vh]">
        {/* Sliding photos as the full hero background (all screens) */}
        <div className="absolute inset-0 overflow-hidden bg-brand-black">
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
        <div className="relative z-20 mx-auto flex w-full max-w-7xl flex-col items-center px-4 pb-6 pt-8 text-center md:min-h-[74vh] md:items-start md:justify-center md:px-6 md:py-16 md:text-left">
          {/* Brand lockup — internally centered so the logo and divider sit
              balanced over the heading, while the block stays left on desktop */}
          <div className="flex flex-col items-center text-center md:w-fit">
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
            <span className="block bg-gradient-to-b from-white via-gray-100 to-gray-400 bg-clip-text text-[3.4rem] tracking-[0.05em] text-transparent md:text-8xl">
              DENVER
            </span>
            <span className="mt-1 block text-gold-gradient text-[1.9rem] tracking-[0.04em] md:text-6xl">
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
            className="mt-3 text-[13px] font-medium tracking-[0.22em] text-white md:text-lg md:tracking-[0.3em]"
          >
            LUXURY CHAUFFEURED TRANSPORTATION
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="mt-4 w-full text-[9px] font-semibold tracking-normal text-white/90 sm:text-[10px] md:text-sm md:tracking-[0.08em]"
          >
            {/* Each row spreads edge-to-edge on mobile so both lines stay balanced */}
            <p className="flex w-full items-center justify-between whitespace-nowrap md:justify-center md:gap-2.5">
              <span>DENVER METRO</span>
              <span className="text-brand-gold-light">•</span>
              <span>DIA</span>
              <span className="text-brand-gold-light">•</span>
              <span>RED ROCKS</span>
              <span className="text-brand-gold-light">•</span>
              <span>MOUNTAIN RESORTS</span>
            </p>
            <p className="mt-2 flex w-full items-center justify-between whitespace-nowrap md:justify-center md:gap-2.5">
              <span>CORPORATE TRAVEL</span>
              <span className="text-brand-gold-light">•</span>
              <span>WEDDINGS &amp; EVENTS</span>
              <span className="text-brand-gold-light">•</span>
              <span>AND MORE</span>
            </p>
          </motion.div>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center md:mt-8"
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
            <div className="mt-1.5 flex flex-col items-center gap-1 self-center sm:ml-16 sm:mt-3 sm:gap-2 sm:self-start lg:ml-24">
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
              <Link
                to="/service-areas"
                className="inline-flex items-center gap-2 rounded-full border border-brand-gold/60 px-7 py-3 text-xs font-semibold tracking-widest text-brand-gold-light shadow-[0_0_14px_rgba(212,175,55,0.35)] transition hover:border-brand-gold hover:bg-brand-gold/5 hover:shadow-[0_0_26px_rgba(212,175,55,0.6)]"
              >
                VIEW ALL SERVICE AREAS
                <ArrowRight className="h-4 w-4" />
              </Link>
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
                <Link
                  to="/about"
                  className="inline-flex items-center gap-2 rounded-full border border-brand-gold/60 px-7 py-3 text-xs font-semibold tracking-widest text-brand-gold-light shadow-[0_0_14px_rgba(212,175,55,0.35)] transition hover:border-brand-gold hover:bg-brand-gold/5 hover:shadow-[0_0_26px_rgba(212,175,55,0.6)]"
                >
                  LEARN MORE ABOUT US
                  <ArrowRight className="h-4 w-4" />
                </Link>
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
                  <p className="mt-2 text-sm text-white/60">{s.shortDescription}</p>
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

      <ReviewsCarousel />
      <CTABanner />
    </>
  )
}
