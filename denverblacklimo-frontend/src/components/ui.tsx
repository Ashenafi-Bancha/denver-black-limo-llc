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
      className={`inline-flex items-center justify-center gap-2 bg-gold-gradient px-8 py-3 text-xs font-bold tracking-[0.2em] text-brand-black transition hover:brightness-110 ${className}`}
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
  return (
    <Link
      to={to}
      className={`inline-flex items-center justify-center gap-2 border border-brand-gold/60 px-8 py-3 text-xs font-bold tracking-[0.2em] text-brand-gold-light transition hover:bg-brand-gold/10 ${className}`}
    >
      {children}
      <ArrowRight className="h-4 w-4" />
    </Link>
  )
}

export function PageHero({
  title,
  subtitle,
  eyebrow,
  image,
  children,
}: {
  title: string
  subtitle?: string
  eyebrow?: string
  image: string
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
      />
      <div className="absolute inset-0 bg-gradient-to-r from-brand-black/95 via-brand-black/75 to-brand-black/40" />
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
