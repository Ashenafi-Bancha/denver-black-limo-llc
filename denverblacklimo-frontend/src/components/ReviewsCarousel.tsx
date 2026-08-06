import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Star } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSiteSettings } from '../context/SiteSettingsContext'
import { defaultReviews } from '../content/defaults'
import type { Review } from '../data/reviews'

export function ReviewsCarousel() {
  const { get } = useSiteSettings()
  const reviews = get<Review[]>('reviews', defaultReviews)
  const [index, setIndex] = useState(0)
  const visible = 3
  const maxIndex = Math.max(0, reviews.length - visible)

  const shift = (dir: number) => {
    setIndex((i) => Math.min(maxIndex, Math.max(0, i + dir)))
  }

  return (
    <section className="bg-brand-cream py-16 text-brand-black md:py-20">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <h2 className="text-center font-display text-3xl font-semibold tracking-wide text-brand-black md:text-4xl">
          Customer Reviews
        </h2>
        <div className="relative mt-10">
          <div className="hidden gap-4 md:grid md:grid-cols-3">
            {reviews.map((r) => (
              <ReviewCard key={r.name} {...r} />
            ))}
          </div>
          <div className="md:hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={reviews[index].name}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <ReviewCard {...reviews[index]} />
              </motion.div>
            </AnimatePresence>
            <div className="mt-4 flex justify-center gap-2">
              {reviews.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Review ${i + 1}`}
                  onClick={() => setIndex(i)}
                  className={`h-2 w-2 rounded-full ${
                    i === index ? 'bg-brand-gold-dark' : 'bg-brand-black/20'
                  }`}
                />
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => shift(-1)}
            className="absolute left-0 top-1/2 hidden -translate-y-1/2 border border-brand-gold/30 p-2 text-brand-gold-dark md:block"
            aria-label="Previous reviews"
          >
            <ChevronLeft />
          </button>
          <button
            type="button"
            onClick={() => shift(1)}
            className="absolute right-0 top-1/2 hidden -translate-y-1/2 border border-brand-gold/30 p-2 text-brand-gold-dark md:block"
            aria-label="Next reviews"
          >
            <ChevronRight />
          </button>
        </div>

        <div className="mt-10 flex justify-center">
          <Link
            to="/reviews"
            className="inline-flex items-center gap-2 rounded-full border border-brand-gold-dark/50 px-7 py-3 text-xs font-bold tracking-widest text-brand-gold-dark transition hover:border-brand-gold-dark hover:bg-brand-gold/10"
          >
            READ ALL REVIEWS
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}

function ReviewCard({
  name,
  quote,
  avatar,
}: {
  name: string
  quote: string
  avatar: string
}) {
  return (
    <article className="rounded-sm bg-white p-6 shadow-lg shadow-black/5 ring-1 ring-black/5">
      <div className="flex items-center justify-between">
        <span className="text-lg font-bold text-[#4285F4]">G</span>
        <div className="flex gap-0.5 text-brand-gold-dark">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className="h-4 w-4 fill-current" />
          ))}
        </div>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-brand-black/80">&ldquo;{quote}&rdquo;</p>
      <div className="mt-6 flex items-center gap-3">
        <img src={avatar} alt="" className="h-10 w-10 rounded-full object-cover" loading="lazy" />
        <p className="text-sm font-semibold">{name}</p>
      </div>
    </article>
  )
}
