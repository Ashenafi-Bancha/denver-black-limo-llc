import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Check, Info, Map, Phone, Sparkles, Users } from 'lucide-react'
import { CTABanner } from '../components/CTABanner'
import { ReviewsCarousel } from '../components/ReviewsCarousel'
import { aboutTrust, TrustRow } from '../components/TrustRow'
import { GoldButton, OutlineButton, SectionHeading } from '../components/ui'
import { homeCoverageList } from '../data/serviceAreas'
import { services } from '../data/services'

const quickNav = [
  { title: 'About Us', desc: 'Our story & values', to: '/about', icon: Info },
  { title: 'Services', desc: '12 premium categories', to: '/services', icon: Sparkles },
  { title: 'Service Areas', desc: 'Statewide coverage', to: '/service-areas', icon: Map },
  { title: 'Fleet', desc: 'Luxury vehicles', to: '/fleet', icon: Users },
  { title: 'Contact', desc: 'Speak with our team', to: '/contact', icon: Phone },
]

export function HomePage() {
  return (
    <>
      <section className="relative min-h-[90vh] overflow-hidden flex flex-col md:block">
        {/* Mobile: Image at top */}
        <motion.div
          className="md:hidden relative w-full h-[45vh] shrink-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          <img
            src="/images/hero1.jpg"
            alt="Denver Black Limo luxury vehicle"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-brand-black" />
        </motion.div>

        {/* Desktop: Image behind text */}
        <motion.img
          src="/images/hero1.jpg"
          alt="Denver Black Limo luxury vehicle"
          className="absolute inset-0 h-full w-full object-cover hidden md:block"
          initial={{ opacity: 0, x: -100 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
        
        {/* Gradient overlay for desktop */}
        <div className="absolute inset-0 bg-gradient-to-r from-brand-black via-brand-black/70 to-brand-black/20 hidden md:block" />
        
        {/* Text content - positioned below image on mobile, centered on desktop */}
        <div className="relative mx-auto flex w-full max-w-7xl flex-col justify-center px-4 pb-16 pt-8 md:min-h-[90vh] md:px-6 md:pt-28">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs tracking-[0.35em] text-brand-gold-light"
          >
            PREMIUM. PROFESSIONAL. PUNCTUAL.
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-4 max-w-4xl font-display text-4xl font-semibold leading-[1.1] md:text-6xl lg:text-7xl"
          >
            <span className="text-gold-gradient">Denver&apos;s Premier</span>
            <br />
            <span className="text-white">Luxury Chauffeured Transportation</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-6 max-w-2xl text-sm leading-relaxed text-white/75 md:text-base"
          >
            Airport Transfers • Corporate Travel • Mountain Resorts • Private Aviation •
            Weddings • Special Events
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-8 flex flex-col gap-3 sm:flex-row"
          >
            <GoldButton to="/book">BOOK NOW</GoldButton>
            <OutlineButton to="/quote">REQUEST A QUOTE</OutlineButton>
          </motion.div>
        </div>
      </section>

      <TrustRow items={aboutTrust} />

      <section className="border-b border-brand-gold/15 bg-brand-charcoal">
        <div className="mx-auto grid max-w-7xl gap-px bg-brand-gold/10 md:grid-cols-5">
          {quickNav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="group flex flex-col border border-transparent bg-brand-charcoal p-6 transition hover:border-brand-gold/30 hover:bg-brand-surface"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-brand-gold/40 text-brand-gold-light transition group-hover:border-brand-gold/70">
                <item.icon className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <h2 className="mt-4 font-display text-lg text-brand-gold-light">{item.title}</h2>
              <p className="mt-2 text-xs text-white/60">{item.desc}</p>
              <ArrowRight className="mt-auto h-4 w-4 pt-6 text-brand-gold/60 transition group-hover:translate-x-1 group-hover:text-brand-gold-light" />
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <motion.div
            className="aspect-square w-full overflow-hidden border border-brand-gold/25"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <img
              src="/images/hero2.jpg"
              alt="Denver Black Limo - serving Colorado"
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
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
            <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {homeCoverageList.map((area) => (
                <motion.div
                  key={area}
                  className="flex items-center gap-2 text-sm text-white/80"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + homeCoverageList.indexOf(area) * 0.1 }}
                >
                  <Check className="h-4 w-4 shrink-0 text-brand-gold-light" />
                  {area}
                </motion.div>
              ))}
            </div>
            <Link
              to="/service-areas"
              className="mt-8 inline-flex items-center gap-2 border border-brand-gold/50 px-6 py-3 text-xs font-semibold tracking-widest text-brand-gold-light transition hover:border-brand-gold hover:bg-brand-gold/5"
            >
              VIEW ALL SERVICE AREAS
              <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
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
                    src={s.heroImage}
                    alt={s.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
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
            <OutlineButton to="/services">VIEW ALL 12 SERVICES</OutlineButton>
          </div>
        </div>
      </section>

      <ReviewsCarousel />
      <CTABanner />
    </>
  )
}
