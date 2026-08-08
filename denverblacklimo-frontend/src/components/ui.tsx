import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight, Calendar } from 'lucide-react'

export function SectionHeading({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <div className="h-px flex-1 bg-brand-gold/30" />
      <h2 className="text-center font-display text-xl tracking-[0.15em] text-brand-gold-light md:text-2xl">
        {children}
      </h2>
      <div className="h-px flex-1 bg-brand-gold/30" />
    </div>
  )
}

export function GoldButton({
  to,
  children,
  className = '',
}: {
  to: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <Link
      to={to}
      // Full width and 52px tall on phones: a half-width 40px pill is an awkward
      // thumb target and reads as secondary. Natural width returns from `sm` up.
      className={`inline-flex w-full min-h-[52px] items-center justify-center gap-2 rounded-full bg-gold-gradient px-8 text-[13px] font-bold tracking-[0.18em] text-brand-black shadow-lg shadow-brand-gold/20 transition hover:brightness-110 hover:shadow-brand-gold/30 sm:min-h-[44px] sm:w-auto sm:py-3 sm:text-xs sm:tracking-[0.2em] ${className}`}
    >
      <Calendar className="h-4 w-4" />
      {children}
    </Link>
  )
}

export function OutlineButton({
  to,
  children,
  className = '',
}: {
  to: string
  children: React.ReactNode
  className?: string
}) {
  // The travelling yellow-to-red border marks these as the "see more" CTAs.
  return (
    <span className={`glow-border glow-border-pill glow-border-warm inline-flex w-full sm:w-auto ${className}`}>
      {/* w-full so the button fills the wrapper — callers pass sizing classes like
          `w-full`, and those land on the wrapper, not the link. */}
      <Link
        to={to}
        className="inline-flex min-h-[49px] w-full items-center justify-center gap-2 rounded-full bg-brand-black px-8 text-[13px] font-bold tracking-[0.18em] text-brand-gold-light transition hover:bg-brand-charcoal hover:text-white sm:min-h-0 sm:py-3 sm:text-xs sm:tracking-[0.2em]"
      >
        {children}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </span>
  )
}

export function PageHero({
  title,
  subtitle,
  eyebrow,
  image,
  fallback,
  children,
}: {
  title: string
  subtitle?: string
  eyebrow?: string
  image: string
  /** Shown if `image` fails to load (e.g. a not-yet-added local file). */
  fallback?: string
  children?: React.ReactNode
}) {
  return (
    <section className="relative min-h-[50vh] overflow-hidden">
      <motion.img
        src={image}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        initial={{ opacity: 0, scale: 1.05 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        onError={(e) => {
          const t = e.currentTarget
          if (!fallback || t.dataset.fallback) return
          t.dataset.fallback = '1'
          t.src = fallback
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-brand-black via-brand-black/65 to-brand-black/20 md:bg-gradient-to-r md:from-brand-black/95 md:via-brand-black/75 md:to-brand-black/40" />
      <motion.div
        className="relative mx-auto flex max-w-7xl flex-col justify-end px-4 pb-12 pt-28 md:px-6 md:pb-16"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
      >
        {eyebrow && (
          <p className="text-xs tracking-[0.3em] text-brand-gold-light/90">{eyebrow}</p>
        )}
        <h1 className="mt-2 max-w-3xl font-display text-4xl font-semibold leading-tight text-white md:text-5xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-4 max-w-2xl text-base text-white/75 md:text-lg">{subtitle}</p>
        )}
        {children}
      </motion.div>
    </section>
  )
}
