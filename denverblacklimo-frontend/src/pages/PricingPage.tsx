import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight, Check, Info, Phone } from 'lucide-react'
import { CTABanner } from '../components/CTABanner'
import { ServiceIcon } from '../components/ServiceIcon'
import { GoldButton, OutlineButton, SectionHeading } from '../components/ui'
import { IMAGES } from '../config/images'
import { useSiteSettings } from '../context/SiteSettingsContext'
import { DEFAULT_BUSINESS, telHref, type BusinessInfo } from '../content/defaults'
import { defaultPricing, type PricingContent } from '../data/pricing'

export function PricingPage() {
  const { get } = useSiteSettings()
  const p = { ...defaultPricing, ...get<Partial<PricingContent>>('pricing', {}) }
  const biz = { ...DEFAULT_BUSINESS, ...get<Partial<BusinessInfo>>('business', {}) }

  const hasAnyRate = p.rates.some((r) => r.hourlyRate?.trim())

  return (
    <>
      {/* Hero — background image blended, matching the site's section heroes */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="/images/services/service-banner-3.jpeg"
            alt=""
            className="h-full w-full object-cover"
            onError={(e) => {
              const t = e.currentTarget
              if (t.dataset.fb) return
              t.dataset.fb = '1'
              t.src = IMAGES.hero1
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-black via-brand-black/85 to-brand-black/50 md:bg-gradient-to-r md:from-brand-black md:via-brand-black/85 md:to-brand-black/30" />
        </div>
        <motion.div
          className="relative mx-auto max-w-7xl px-4 pb-14 pt-28 md:px-6 md:py-24"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        >
          <p className="text-xs font-bold tracking-[0.35em] text-brand-gold-light">
            {p.eyebrow.toUpperCase()}
          </p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-semibold leading-tight text-white md:text-5xl">
            {p.title}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/75 md:text-base">
            {p.subtitle}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <GoldButton to="/book">BOOK NOW</GoldButton>
            <OutlineButton to="/quote">GET A QUOTE</OutlineButton>
          </div>
        </motion.div>
      </section>

      {/* Intro */}
      <section className="mx-auto max-w-4xl px-4 pt-14 text-center md:px-6">
        <p className="text-sm leading-relaxed text-white/75 md:text-base">{p.intro}</p>
      </section>

      {/* How pricing works */}
      <section className="mx-auto max-w-7xl px-4 py-14 md:px-6">
        <SectionHeading className="mb-10">How Our Pricing Works</SectionHeading>
        <div className="grid gap-5 md:grid-cols-3">
          {p.models.map((m, i) => (
            <motion.div
              key={m.title}
              className="rounded-xl border border-brand-gold/25 bg-brand-surface/40 p-6 transition hover:border-brand-gold/50"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full border border-brand-gold/50 text-brand-gold-light">
                <ServiceIcon name={m.icon} className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-display text-xl text-white">{m.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/65">{m.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Rate table */}
      <section className="border-y border-brand-gold/15 bg-brand-charcoal py-14">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <SectionHeading className="mb-4">{p.ratesTitle}</SectionHeading>
          <p className="mx-auto mb-8 max-w-3xl text-center text-sm text-white/60">{p.ratesNote}</p>

          <div className="overflow-x-auto rounded-xl border border-brand-gold/25">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-brand-gold/30 bg-brand-surface text-xs tracking-widest text-brand-gold-light">
                  <th className="px-5 py-4 font-semibold">VEHICLE</th>
                  <th className="px-5 py-4 font-semibold">CAPACITY</th>
                  <th className="px-5 py-4 font-semibold">STARTING RATE</th>
                  <th className="px-5 py-4 font-semibold">MINIMUM</th>
                </tr>
              </thead>
              <tbody>
                {p.rates.map((r) => {
                  const rate = r.hourlyRate?.trim()
                  return (
                    <tr
                      key={r.vehicle}
                      className="border-b border-white/5 text-white/80 last:border-0 odd:bg-brand-black even:bg-brand-surface/40"
                    >
                      <td className="px-5 py-4 font-medium text-white">{r.vehicle}</td>
                      <td className="px-5 py-4 text-white/60">{r.capacity}</td>
                      <td className="px-5 py-4">
                        {rate ? (
                          <span className="font-display text-lg text-brand-gold-light">
                            {p.currency}
                            {rate}
                            <span className="text-xs text-white/50"> /hr</span>
                          </span>
                        ) : (
                          // Published rates are pending from the client; show a holding
                          // label rather than an empty cell.
                          <span className="inline-flex items-center rounded-full border border-brand-gold/30 bg-brand-gold/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-brand-gold-light">
                            Coming soon
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-white/60">{r.minimumHours || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {!hasAnyRate && (
            <div className="mt-5 text-center">
              <p className="text-xs text-white/45">
                Published rates are on the way. In the meantime every trip is quoted individually —
                tell us your route and we will send your price.
              </p>
              <Link
                to="/quote"
                className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-brand-gold/50 px-5 py-2 text-xs font-bold tracking-wider text-brand-gold-light transition hover:bg-brand-gold/10"
              >
                REQUEST A QUOTE <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Always included */}
      <section className="mx-auto max-w-7xl px-4 py-14 md:px-6">
        <SectionHeading className="mb-10">{p.includedTitle}</SectionHeading>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {p.included.map((item, i) => (
            <motion.div
              key={item.title}
              className="flex items-start gap-4 rounded-xl border border-brand-gold/20 bg-brand-surface/30 p-5"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.45, delay: (i % 3) * 0.07 }}
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-brand-gold/40 text-brand-gold-light">
                <ServiceIcon name={item.icon} className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-display text-lg text-white">{item.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-white/60">{item.text}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Policies */}
      <section id="policies" className="scroll-mt-28 border-y border-brand-gold/15 bg-brand-charcoal py-14">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <SectionHeading className="mb-10">{p.policiesTitle}</SectionHeading>
          <div className="grid gap-4 md:grid-cols-2">
            {p.policies.map((item, i) => (
              <motion.div
                key={item.title}
                className="flex items-start gap-4 rounded-xl border border-brand-gold/20 bg-brand-black/50 p-5"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.45, delay: (i % 2) * 0.08 }}
              >
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-brand-gold-light" />
                <div>
                  <h3 className="font-display text-lg text-white">{item.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-white/60">{item.text}</p>
                </div>
              </motion.div>
            ))}
          </div>
          <p className="mt-8 text-sm text-white/60">
            These are the highlights. The complete reservation agreement, including the payment schedule, card-on-file
            authorization, cancellation windows and airport pick-up procedures, is published at{' '}
            <Link to="/terms" className="font-semibold text-brand-gold-light underline-offset-4 hover:underline">
              Terms &amp; Conditions
            </Link>
            .
          </p>

          <div className="mt-8 flex items-start gap-3 rounded-xl border border-white/10 bg-brand-surface/40 p-4 text-xs leading-relaxed text-white/55">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-gold/70" />
            {p.disclaimer}
          </div>
        </div>
      </section>

      {/* Talk to us */}
      <section className="mx-auto max-w-7xl px-4 py-14 text-center md:px-6">
        <h2 className="font-display text-2xl text-white md:text-3xl">
          Prefer to talk it through?
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-white/65">
          Tell us your route and schedule and we will send an exact price — usually within minutes.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <GoldButton to="/quote">GET MY PRICE</GoldButton>
          <a
            href={telHref(biz.phone)}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-brand-gold/60 px-7 py-3 text-xs font-bold tracking-[0.2em] text-brand-gold-light transition hover:border-brand-gold hover:bg-brand-gold/10"
          >
            <Phone className="h-4 w-4" /> {biz.phone}
          </a>
        </div>
      </section>

      <CTABanner title="Reserve Your Luxury Transportation" />
    </>
  )
}
