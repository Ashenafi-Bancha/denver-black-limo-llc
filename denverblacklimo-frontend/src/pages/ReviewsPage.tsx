import { motion } from 'framer-motion'
import { ArrowUpRight, Quote, Star } from 'lucide-react'
import { CTABanner } from '../components/CTABanner'
import { ServiceIcon } from '../components/ServiceIcon'
import { GoldButton, OutlineButton, SectionHeading } from '../components/ui'
import { IMAGES } from '../config/images'
import { useSiteSettings } from '../context/SiteSettingsContext'
import { defaultReviews } from '../content/defaults'
import { reviewPlatforms as defaultPlatforms, type Review, type ReviewPlatform } from '../data/reviews'

function Stars({ count = 5, className = 'h-4 w-4' }: { count?: number; className?: string }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`${count} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`${className} ${i < count ? 'fill-brand-gold-light text-brand-gold-light' : 'text-white/20'}`}
        />
      ))}
    </span>
  )
}

export function ReviewsPage() {
  const { get } = useSiteSettings()
  const reviews = get<Review[]>('reviews', defaultReviews)
  const platforms = get<ReviewPlatform[]>('review_platforms', defaultPlatforms).filter((p) => p.url?.trim())

  const average =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + (r.rating ?? 5), 0) / reviews.length
      : 5

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="/images/about-hero.jpg"
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
          <p className="text-xs font-bold tracking-[0.35em] text-brand-gold-light">CLIENT REVIEWS</p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-semibold leading-tight text-white md:text-5xl">
            Trusted by Travelers Across Colorado
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/75 md:text-base">
            From DIA arrivals and corporate roadshows to weddings and mountain escapes — here is what
            our clients say about riding with Denver Black Limo.
          </p>

          {/* Rating summary */}
          <div className="mt-8 inline-flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border border-brand-gold/40 bg-brand-black/60 px-6 py-4 backdrop-blur-sm">
            <div>
              <span className="font-display text-4xl text-brand-gold-light">{average.toFixed(1)}</span>
              <span className="text-sm text-white/50"> / 5</span>
            </div>
            <div>
              <Stars count={Math.round(average)} className="h-5 w-5" />
              <p className="mt-1 text-xs tracking-widest text-white/60">
                BASED ON {reviews.length} CLIENT {reviews.length === 1 ? 'REVIEW' : 'REVIEWS'}
              </p>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Review grid */}
      <section className="mx-auto max-w-7xl px-4 py-14 md:px-6">
        <SectionHeading className="mb-10">What Our Clients Say</SectionHeading>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {reviews.map((r, i) => (
            <motion.article
              key={`${r.name}-${i}`}
              className="relative flex flex-col rounded-xl border border-brand-gold/25 bg-brand-surface/40 p-6 transition hover:border-brand-gold/50"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.5, delay: (i % 3) * 0.08 }}
            >
              <Quote className="absolute right-5 top-5 h-8 w-8 text-brand-gold/15" />
              <Stars count={r.rating ?? 5} />
              <p className="mt-4 flex-1 text-sm leading-relaxed text-white/75">&ldquo;{r.quote}&rdquo;</p>

              <div className="mt-6 flex items-center gap-3 border-t border-white/10 pt-4">
                <img
                  src={r.avatar}
                  alt={r.name}
                  loading="lazy"
                  className="h-10 w-10 rounded-full border border-brand-gold/40 object-cover"
                  onError={(e) => {
                    e.currentTarget.style.visibility = 'hidden'
                  }}
                />
                <div className="min-w-0">
                  <p className="truncate font-display text-base text-white">{r.name}</p>
                  <p className="truncate text-xs text-white/50">
                    {[r.service, r.source && `via ${r.source}`].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </section>

      {/* Platforms */}
      {platforms.length > 0 && (
        <section className="border-y border-brand-gold/15 bg-brand-charcoal py-14">
          <div className="mx-auto max-w-7xl px-4 md:px-6">
            <SectionHeading className="mb-4">Find Us Online</SectionHeading>
            <p className="mx-auto mb-10 max-w-2xl text-center text-sm text-white/60">
              Read more reviews, see recent trips, and share your own experience.
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {platforms.map((pf) => (
                <a
                  key={pf.name}
                  href={pf.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-4 rounded-xl border border-brand-gold/25 bg-brand-black/50 p-5 transition hover:-translate-y-0.5 hover:border-brand-gold/60 hover:shadow-lg hover:shadow-brand-gold/10"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-brand-gold/40 text-brand-gold-light transition group-hover:bg-brand-gold/15">
                    <ServiceIcon name={pf.icon} className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-lg text-white">{pf.name}</span>
                    <span className="block truncate text-xs text-white/55">{pf.blurb}</span>
                  </span>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-brand-gold-light transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Share your experience */}
      <section className="mx-auto max-w-7xl px-4 py-14 text-center md:px-6">
        <h2 className="font-display text-2xl text-white md:text-3xl">Rode with us recently?</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-white/65">
          Your feedback helps other Colorado travelers find a chauffeur service they can trust —
          and helps us keep raising our standard.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <GoldButton to="/book">BOOK YOUR NEXT RIDE</GoldButton>
          <OutlineButton to="/contact">SHARE YOUR EXPERIENCE</OutlineButton>
        </div>
      </section>

      <CTABanner title="Experience the Difference for Yourself" />
    </>
  )
}
