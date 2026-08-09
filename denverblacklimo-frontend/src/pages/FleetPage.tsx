import { motion } from 'framer-motion'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Briefcase, Check, Clock, Crown, Info, Luggage, Phone, Shield, User, Users, X } from 'lucide-react'
import { CTABanner } from '../components/CTABanner'
import { GoldButton, OutlineButton, SectionHeading } from '../components/ui'
import { useSiteSettings } from '../context/SiteSettingsContext'
import {
  defaultFleet,
  DEFAULT_BUSINESS,
  DEFAULT_PAGE_BANNERS,
  telHref,
  type BusinessInfo,
  type PageBanners,
} from '../content/defaults'
import type { FleetVehicle } from '../data/fleet'
import { VehicleImage } from '../components/VehicleImage'
import { IMAGES } from '../config/images'

const fleetTrust = [
  { icon: User, label: 'Professional Chauffeurs' },
  { icon: Shield, label: 'Safe & Reliable' },
  { icon: Clock, label: '24/7 Availability' },
  { icon: Crown, label: 'Premium Experience' },
]

const whyChoose = [
  'Professionally maintained vehicles',
  'Commercially licensed & insured',
  'Cleaned and inspected before every ride',
  'Experienced, professional chauffeurs',
  'Spacious luggage capacity',
  'Airport, corporate, mountain & event travel',
  'Small groups or large group solutions',
  'Available 24/7',
]

export function FleetPage() {
  const { get } = useSiteSettings()
  const fleet = get<FleetVehicle[]>('fleet', defaultFleet)
  const biz = { ...DEFAULT_BUSINESS, ...get<Partial<BusinessInfo>>('business', {}) }
  const banners = { ...DEFAULT_PAGE_BANNERS, ...get<Partial<PageBanners>>('page_banners', {}) }
  // Blank lines separate paragraphs in the CMS field.
  const fleetIntroParagraphs = banners.fleetIntro.split(/\n\s*\n/).filter((p) => p.trim())
  const [selected, setSelected] = useState<FleetVehicle | null>(null)

  return (
    <>
      {/* Hero — background image like the other section heroes; on mobile the
          image sits on top and blends smoothly into the text below. */}
      <section className="relative overflow-hidden">
        {/* Mobile: image banner fading into the content */}
        <div className="relative h-[38vh] min-h-[260px] md:hidden">
          <motion.img
            src={banners.fleetImage}
            alt="Denver Black Limo luxury fleet line-up"
            className="absolute inset-0 h-full w-full object-cover"
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            onError={(e) => {
              const t = e.currentTarget
              if (t.dataset.fallback) return
              t.dataset.fallback = '1'
              t.src = IMAGES.hero1
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-black via-brand-black/35 to-transparent" />
        </div>

        {/* Desktop: full background image with a smooth left-to-right blend */}
        <div className="absolute inset-0 hidden md:block">
          <motion.img
            src={banners.fleetImage}
            alt=""
            className="h-full w-full object-cover"
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            onError={(e) => {
              const t = e.currentTarget
              if (t.dataset.fallback) return
              t.dataset.fallback = '1'
              t.src = IMAGES.hero1
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-brand-black via-brand-black/80 to-brand-black/25" />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-brand-black to-transparent" />
        </div>

        <motion.div
          className="relative mx-auto max-w-7xl px-4 pb-10 pt-2 md:px-6 md:py-24"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut', delay: 0.15 }}
        >
          <p className="text-xs font-bold tracking-[0.35em] text-brand-gold-light">
            {banners.fleetEyebrow}
          </p>
          <h1 className="mt-3 font-display text-4xl font-bold leading-tight text-white md:text-5xl">
            {banners.fleetTitle}
            <span className="mt-1 block font-semibold text-gold-gradient">
              {banners.fleetTitleAccent}
            </span>
          </h1>
          <div className="mt-4 flex w-40 items-center gap-2">
            <span className="h-px flex-1 bg-brand-gold/60" />
            <span className="h-1.5 w-1.5 rotate-45 bg-brand-gold-light" />
            <span className="h-px flex-1 bg-brand-gold/60" />
          </div>
          <div className="mt-6 max-w-2xl space-y-4 text-sm leading-relaxed text-white/75 md:text-[15px]">
            {fleetIntroParagraphs.map((paragraph) => (
              <p key={paragraph.slice(0, 40)}>{paragraph}</p>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Trust badges */}
      <section className="mx-auto grid max-w-5xl grid-cols-2 gap-6 px-4 py-12 md:grid-cols-4 md:px-6">
        {fleetTrust.map((t) => (
          <div key={t.label} className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-brand-gold/50 text-brand-gold-light">
              <t.icon className="h-6 w-6" strokeWidth={1.5} />
            </div>
            <p className="text-xs font-semibold tracking-widest text-white/85">{t.label.toUpperCase()}</p>
          </div>
        ))}
      </section>

      {/* Vehicle cards */}
      <section className="mx-auto max-w-7xl px-4 pb-16 md:px-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {fleet.map((vehicle, index) => (
            <motion.article
              key={vehicle.id}
              id={vehicle.id}
              className="flex scroll-mt-28 flex-col overflow-hidden rounded-2xl border border-brand-gold/40 bg-brand-cream shadow-lg shadow-brand-black/20 transition hover:border-brand-gold"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.5, delay: (index % 3) * 0.08, ease: 'easeOut' }}
            >
              {/* Photo with the design's curved bottom edge */}
              <div className="relative overflow-hidden [border-radius:0_0_50%_50%/0_0_2rem_2rem]">
                <VehicleImage vehicle={vehicle} className="aspect-[16/11] w-full object-cover transition duration-500 hover:scale-105" />
                <span className="absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-brand-gold/70 bg-brand-black/70 font-display text-sm text-brand-gold-light">
                  {vehicle.number ?? index + 1}
                </span>
              </div>
              <div className="flex flex-1 flex-col px-5 pb-6 pt-5 text-center">
                {/* Stats — gold icons, divider between */}
                <div className="flex items-stretch justify-center gap-6">
                  <div className="flex flex-col items-center">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-brand-gold-dark" strokeWidth={1.5} />
                      <span className="font-display text-2xl text-brand-black">{vehicle.passengers ?? '—'}</span>
                    </div>
                    <p className="mt-1 text-[10px] tracking-[0.2em] text-brand-black/55">PASSENGERS</p>
                  </div>
                  <div className="w-px bg-brand-gold-dark/40" />
                  <div className="flex flex-col items-center">
                    <div className="flex items-center gap-2">
                      <Luggage className="h-5 w-5 text-brand-gold-dark" strokeWidth={1.5} />
                      <span className="font-display text-2xl text-brand-black">{vehicle.luggage ?? '—'}</span>
                    </div>
                    <p className="mt-1 text-[10px] tracking-[0.2em] text-brand-black/55">LUGGAGE</p>
                  </div>
                </div>
                {/* Diamond separator */}
                <div className="mx-auto mt-4 flex w-44 items-center gap-2">
                  <span className="h-px flex-1 bg-brand-gold-dark/40" />
                  <span className="h-1.5 w-1.5 rotate-45 bg-brand-gold-dark" />
                  <span className="h-px flex-1 bg-brand-gold-dark/40" />
                </div>
                <h2 className="mt-3 font-display text-3xl text-brand-black">{vehicle.name}</h2>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-brand-black/70">{vehicle.description}</p>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelected(vehicle)}
                    className="rounded-full border border-brand-black/30 px-3 py-2.5 text-[11px] font-bold tracking-widest text-brand-black transition hover:border-brand-gold-dark hover:text-brand-gold-dark"
                  >
                    VIEW DETAILS
                  </button>
                  <Link
                    to="/book"
                    className="rounded-full bg-gold-gradient px-3 py-2.5 text-[11px] font-bold tracking-widest text-brand-black shadow-md shadow-brand-gold/30 transition hover:brightness-110"
                  >
                    REQUEST THIS VEHICLE
                  </Link>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </section>

      {/* Comparison table */}
      <section className="mx-auto max-w-7xl px-4 pb-16 md:px-6">
        <SectionHeading className="mb-8">Fleet Comparison</SectionHeading>
        <div className="overflow-x-auto rounded-xl border border-brand-gold/25">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-brand-gold/30 bg-brand-surface text-xs tracking-widest text-brand-gold-light">
                <th className="px-4 py-3 font-semibold">VEHICLE</th>
                <th className="px-4 py-3 font-semibold">PASSENGERS</th>
                <th className="px-4 py-3 font-semibold">LUGGAGE</th>
                <th className="px-4 py-3 font-semibold">BEST FOR</th>
              </tr>
            </thead>
            <tbody>
              {fleet.map((v) => (
                <tr key={v.id} className="border-b border-white/5 text-white/80 last:border-0 odd:bg-brand-black even:bg-brand-surface/40">
                  <td className="px-4 py-3 font-medium text-white">{v.name}</td>
                  <td className="px-4 py-3">{v.passengers ?? v.capacity}</td>
                  <td className="px-4 py-3">{v.luggage ?? '—'}</td>
                  <td className="px-4 py-3 text-white/65">{v.bestFor ?? v.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Why choose + commitment */}
      <section className="mx-auto max-w-7xl px-4 pb-12 md:px-6">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-xl border border-brand-gold/25 bg-brand-surface p-6 md:p-8 lg:col-span-2">
            <h2 className="font-display text-2xl text-brand-gold-light">Why Choose Our Fleet?</h2>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {whyChoose.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-white/80">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-gold-light" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-brand-gold/40 bg-brand-charcoal p-6 md:p-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-brand-gold/50 text-brand-gold-light">
              <Shield className="h-6 w-6" strokeWidth={1.5} />
            </div>
            <h3 className="mt-4 font-display text-xl text-brand-gold-light">Our Commitment</h3>
            <p className="mt-3 text-sm leading-relaxed text-white/70">
              Your safety, comfort, and satisfaction are our top priorities. We deliver a
              first-class transportation experience every time you ride with us.
            </p>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-white/10 bg-brand-surface/40 p-4 text-xs text-white/55">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-gold/70" />
          Vehicle images are representative of each fleet category. Exact make, model, color,
          configuration, and capacity may vary based on availability and trip requirements.
        </div>
      </section>

      {/* Find-the-right-vehicle CTA bar */}
      <section className="border-t border-brand-gold/20 bg-brand-charcoal">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-4 py-10 text-center md:flex-row md:px-6 md:text-left">
          <div className="flex items-center gap-4">
            <div className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-full border border-brand-gold/50 text-brand-gold-light md:flex">
              <Phone className="h-6 w-6" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="font-display text-2xl text-white">Find the Right Vehicle for Your Journey</h2>
              <p className="mt-1 text-sm text-white/60">
                Premium vehicles. Professional chauffeurs. First-class service.
              </p>
              <a href={telHref(biz.phone)} className="mt-1 inline-block font-display text-xl text-brand-gold-light">
                {biz.phone}
              </a>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <GoldButton to="/book">RESERVE YOUR RIDE</GoldButton>
            <OutlineButton to="/quote">REQUEST A QUOTE</OutlineButton>
          </div>
        </div>
      </section>

      <CTABanner title="Reserve the Perfect Vehicle" />

      {/* Details modal */}
      {selected && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`${selected.name} details`}
        >
          <button
            type="button"
            aria-label="Close details"
            onClick={() => setSelected(null)}
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
          />
          <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-brand-gold/40 bg-brand-charcoal shadow-2xl">
            <div className="relative aspect-[16/9] overflow-hidden">
              <VehicleImage vehicle={selected} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Close"
                className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-brand-black/70 text-white transition hover:border-brand-gold/60"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-6">
              <h2 className="font-display text-3xl text-brand-gold-light">{selected.name}</h2>
              <div className="mt-3 flex items-center gap-6 text-sm text-white/85">
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-brand-gold-light" /> {selected.passengers ?? selected.capacity} passengers
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Luggage className="h-4 w-4 text-brand-gold-light" /> {selected.luggage ?? '—'} luggage
                </span>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-white/70">{selected.description}</p>
              {selected.bestFor && (
                <div className="mt-4">
                  <p className="flex items-center gap-2 text-xs tracking-widest text-brand-gold-light">
                    <Briefcase className="h-4 w-4" /> BEST FOR
                  </p>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {selected.bestFor.split(',').map((b) => (
                      <li key={b} className="rounded-full border border-brand-gold/30 px-3 py-1 text-xs text-white/75">
                        {b.trim()}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <GoldButton to="/book" className="flex-1">REQUEST THIS VEHICLE</GoldButton>
                <OutlineButton to="/quote" className="flex-1">GET A QUOTE</OutlineButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
