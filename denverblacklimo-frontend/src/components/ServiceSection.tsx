import { motion } from 'framer-motion'
import { SubServiceGrid } from './SubServiceGrid'
import { ServiceIcon } from './ServiceIcon'
import { GoldButton } from './ui'
import type { Service } from '../data/services'

export function ServiceSection({ service }: { service: Service }) {
  return (
    <motion.section
      id={service.slug}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.45 }}
      className="scroll-mt-24 border-t border-brand-gold/20"
    >
      <div className="relative min-h-[45vh] overflow-hidden md:min-h-[50vh]">
        <img
          src={service.heroImage}
          alt={service.title}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-black via-brand-black/75 to-brand-black/35" />
        <div className="relative mx-auto max-w-7xl px-4 pb-10 pt-12 md:px-6 md:pb-12 md:pt-14">
          <p className="text-xs tracking-[0.3em] text-brand-gold-light">
            {String(service.number).padStart(2, '0')}. SERVICE
          </p>
          <h2 className="mt-2 font-display text-3xl font-semibold text-brand-gold-light md:text-4xl lg:text-5xl">
            {service.title.toUpperCase()}
          </h2>
          <p className="mt-4 max-w-2xl text-sm text-white/75 md:text-base">{service.intro}</p>
          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
            {service.trustIcons.map((t) => (
              <div key={t.label} className="flex flex-col items-center text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-brand-gold/50 text-brand-gold-light">
                  <ServiceIcon name={t.icon} />
                </div>
                <p className="mt-2 text-[10px] tracking-widest text-white/80">{t.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-14 md:px-6 md:py-16">
        <SubServiceGrid items={service.subServices} />
        <div className="mt-10 flex justify-center">
          <GoldButton to="/book">RESERVE YOUR RIDE NOW</GoldButton>
        </div>
      </div>
    </motion.section>
  )
}
