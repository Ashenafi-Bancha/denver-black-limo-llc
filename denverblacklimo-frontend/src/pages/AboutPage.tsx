import { motion } from 'framer-motion'
import { Calendar, Crown, Diamond, Headphones, Plane, Shield, User } from 'lucide-react'
import { CTABanner } from '../components/CTABanner'
import { aboutTrust, TrustRow } from '../components/TrustRow'
import { GoldButton, OutlineButton } from '../components/ui'
import { FOUNDED } from '../constants'
import { IMAGES } from '../config/images'
import { useSiteSettings } from '../context/SiteSettingsContext'
import { DEFAULT_ABOUT, type AboutContent } from '../content/defaults'

const whyChoose = [
  {
    icon: User,
    title: 'Professional Chauffeurs',
    text: 'Courteous, background-checked chauffeurs trained in discretion and hospitality.',
  },
  {
    icon: Shield,
    title: 'Safe & Punctual',
    text: 'Meticulously maintained vehicles and proactive trip planning for on-time arrivals.',
  },
  {
    icon: Plane,
    title: 'Flight Tracking',
    text: 'Real-time flight monitoring and flexible scheduling for airport clients.',
  },
  {
    icon: Calendar,
    title: '24/7 Availability',
    text: 'Day or night, weekday or weekend — our team is ready when you need us.',
  },
  {
    icon: Crown,
    title: 'Luxury for Every Occasion',
    text: 'From airport transfers to weddings and VIP events — refined service throughout.',
  },
  {
    icon: Headphones,
    title: 'Personalized Attention',
    text: 'Dedicated support from reservation to arrival for a seamless experience.',
  },
]

export function AboutPage() {
  const { get } = useSiteSettings()
  const about = { ...DEFAULT_ABOUT, ...get<Partial<AboutContent>>('about', {}) }
  return (
    <>
      <section className="relative min-h-[55vh] overflow-hidden">
        <motion.img
          src={about.heroImage}
          alt="Denver Black Limo luxury vehicle"
          className="absolute inset-0 h-full w-full object-cover"
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          onError={(e) => {
            const t = e.currentTarget
            if (t.dataset.fallback) return
            t.dataset.fallback = '1'
            t.src = IMAGES.hero1
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-black via-brand-black/65 to-brand-black/20 md:bg-gradient-to-r md:from-brand-black md:via-brand-black/85 md:to-brand-black/40" />
        <div className="relative mx-auto max-w-7xl px-4 pb-14 pt-28 md:px-6 md:pb-16">
          <p className="text-xs tracking-[0.35em] text-brand-gold-light">ABOUT US</p>
          <h1 className="mt-3 font-display text-4xl font-semibold text-white md:text-5xl">
            Colorado&apos;s Premier
            <br />
            <span className="text-gold-gradient">Luxury Chauffeured Transportation</span>
          </h1>
        </div>
      </section>

      <section className="section-cream py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="grid items-center gap-8 md:grid-cols-3 md:gap-12 lg:gap-16">
            {/* Established card — top on mobile, left on desktop */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="mx-auto w-full max-w-xs md:col-span-1 md:mx-0"
            >
              <div className="flex flex-col items-center gap-4 rounded-2xl border border-brand-gold-dark/40 bg-brand-cream p-8 text-center shadow-lg shadow-brand-black/10">
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-brand-gold-dark/50 text-brand-gold-dark">
                  <Calendar className="h-6 w-6" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-[10px] tracking-[0.25em] text-brand-black/50">ESTABLISHED IN</p>
                  <p className="mt-1 font-display text-2xl text-brand-gold-dark">{FOUNDED.toUpperCase()}</p>
                </div>
                <div className="h-px w-12 bg-brand-gold-dark/40" />
                <p className="text-[11px] tracking-[0.2em] text-brand-black/60">DENVER, COLORADO</p>
              </div>
            </motion.div>

            {/* Story — below on mobile, right on desktop */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
              className="md:col-span-2"
            >
              <p className="text-sm leading-relaxed text-brand-black/75 md:text-base">
                Denver Black Limo LLC is Colorado&apos;s premier luxury transportation company. Since our
                founding in Denver, Colorado, we have been committed to providing unparalleled chauffeured
                service for discerning travelers — executives, families, and VIP guests who expect more than
                a ride.
              </p>
              <p className="mt-4 text-sm leading-relaxed text-brand-black/75 md:text-base">
                From Denver International Airport and private FBO terminals to mountain resorts, corporate
                campuses, weddings, and special events, we deliver seamless ground transportation designed
                around comfort, punctuality, and understated elegance.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="section-dark border-y border-brand-gold/15 py-16 md:py-20">
        <div className="mx-auto max-w-4xl px-4 text-center md:px-6">
          <p className="text-xs tracking-[0.3em] text-brand-gold-light">OUR MISSION</p>
          <h2 className="mt-3 font-display text-3xl text-brand-gold-light md:text-4xl">
            Elevating Every Journey
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-sm leading-relaxed text-white/70 md:text-base">
            With every ride, we strive to elevate your travel experience through punctuality,
            professionalism, and safety. Whether you need a single airport transfer or coordinated
            group logistics, our team is available 24/7 to deliver a premium experience worthy of
            the Denver Black Limo name.
          </p>
        </div>
      </section>

      <TrustRow items={aboutTrust} />

      <section className="section-cream py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="mb-12 flex items-center gap-4">
            <div className="h-px flex-1 bg-brand-gold-dark/30" />
            <h2 className="text-center font-display text-2xl tracking-wide text-brand-black md:text-3xl">
              Why Choose Denver Black Limo?
            </h2>
            <div className="h-px flex-1 bg-brand-gold-dark/30" />
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {whyChoose.map((item, index) => (
              <motion.article
                key={item.title}
                className="text-center"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.15, ease: "easeOut" }}
              >
                <motion.div
                  className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-brand-gold/40 bg-brand-cream/10 text-brand-gold-light transition-all duration-300 hover:border-brand-gold hover:bg-brand-gold/20 hover:shadow-lg hover:shadow-brand-gold/25"
                  whileHover={{ scale: 1.1, boxShadow: '0 0 20px rgba(212, 175, 55, 0.3)' }}
                >
                  <item.icon className="h-7 w-7" strokeWidth={1.25} />
                </motion.div>
                <h3 className="mt-4 font-display text-lg text-brand-black">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-brand-black/65">{item.text}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section className="section-dark py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="font-display text-3xl text-brand-gold-light">Our Story</h2>
              <p className="mt-4 text-sm leading-relaxed text-white/70 md:text-base">
                Since {FOUNDED}, Denver Black Limo has grown into one of Colorado&apos;s most trusted
                names in luxury chauffeured transportation. What began as a commitment to redefine
                ground travel in Denver has expanded into comprehensive service across the Front Range,
                mountain resorts, and destinations statewide.
              </p>
              <p className="mt-4 text-sm leading-relaxed text-white/70 md:text-base">
                We serve airport transfers, executive and corporate travel, mountain resort transportation,
                weddings, concerts at Red Rocks, brewery and winery tours, private city tours, and group
                events — always with the same standard of professionalism our clients expect.
              </p>
              <p className="mt-4 text-sm leading-relaxed text-white/70 md:text-base">
                Our fleet of luxury sedans, SUVs, and specialty vehicles is maintained to the highest
                standards, and every chauffeur is selected for expertise, discretion, and a genuine
                dedication to hospitality.
              </p>
            </div>
            {/* Founder — right of Our Story on desktop, below it on mobile.
                Desktop: a tall, narrow portrait beside the text so the whole
                founder is visible instead of a cropped wide band. */}
            <div className="mx-auto flex w-full max-w-md flex-col gap-6 lg:mx-0 lg:max-w-none lg:flex-row lg:items-center lg:gap-7">
              <div className="relative aspect-[4/5] w-full overflow-hidden border-2 border-brand-gold/50 lg:aspect-[9/16] lg:w-[42%] lg:shrink-0">
                <img
                  src={about.founderImage}
                  alt={about.founderName}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover object-[center_32%] lg:object-[center_42%]"
                  onError={(e) => {
                    const t = e.currentTarget
                    if (t.dataset.fallback) return
                    t.dataset.fallback = '1'
                    t.src = 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=800&auto=format&fit=crop&q=80'
                  }}
                />
              </div>
              <div className="lg:flex-1">
                <p className="text-xs tracking-[0.3em] text-brand-gold-light">MEET OUR FOUNDER</p>
                <h3 className="mt-2 font-display text-2xl text-white">{about.founderName}</h3>
                <p className="mt-1 text-sm tracking-widest text-brand-gold-light">{about.founderTitle}</p>
                <blockquote className="relative mt-4 border-l-2 border-brand-gold/50 pl-5">
                  <Diamond className="absolute -left-3 top-0 h-5 w-5 text-brand-gold-light" />
                  <p className="font-display text-lg italic leading-relaxed text-white/85 md:text-xl">
                    &ldquo;{about.founderQuote}&rdquo;
                  </p>
                </blockquote>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden border-t border-brand-gold/15 py-16 md:py-20">
        <img
          src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600&q=80"
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-15"
          loading="lazy"
        />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 md:grid-cols-2 md:px-6">
          <div className="border border-brand-gold/25 bg-brand-black/80 p-8 backdrop-blur-sm">
            <h3 className="font-display text-2xl text-brand-gold-light">Our Vision</h3>
            <p className="mt-4 text-sm leading-relaxed text-white/70">
              To be Colorado&apos;s most trusted and respected chauffeured transportation company —
              recognized for excellence in service, safety, and client satisfaction across every mile
              we drive.
            </p>
          </div>
          <div className="border border-brand-gold/25 bg-brand-black/80 p-8 backdrop-blur-sm">
            <h3 className="font-display text-2xl text-brand-gold-light">Our Promise</h3>
            <p className="mt-4 text-sm leading-relaxed text-white/70">
              Every client receives safe, reliable, on-time service — every single ride. From your first
              reservation to your final destination, we are committed to making your journey effortless
              and exceptional.
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-brand-gold/15 bg-brand-charcoal py-12">
        <div className="mx-auto flex max-w-4xl flex-col gap-4 px-4 sm:flex-row md:px-6">
          <div className="flex-1 border border-brand-gold/40 p-6 text-center">
            <GoldButton to="/book" className="w-full">
              RESERVE YOUR RIDE
            </GoldButton>
            <p className="mt-3 text-xs tracking-widest text-white/50">
              Safe. Reliable. On Time. Every Time.
            </p>
          </div>
          <div className="flex-1 border border-brand-gold/40 p-6 text-center">
            <OutlineButton to="/quote" className="w-full">
              REQUEST A QUOTE
            </OutlineButton>
            <p className="mt-3 text-xs tracking-widest text-white/50">
              Let us create a custom experience for you.
            </p>
          </div>
        </div>
      </section>

      <CTABanner />
    </>
  )
}
