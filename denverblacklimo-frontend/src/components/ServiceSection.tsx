import { motion } from 'framer-motion'
import { SubServiceGrid } from './SubServiceGrid'
import { ServiceIcon } from './ServiceIcon'
import { GoldButton } from './ui'
import { FallbackImage } from './FallbackImage'
import { imageCandidates, numberedPaths } from '../lib/imageSource'
import { services as builtInServices, type Service } from '../data/services'

export function ServiceSection({ service }: { service: Service }) {
  const num = String(service.number).padStart(2, '0')
  // A hero image set in the admin wins; otherwise the client banner at
  // /images/services/service-banner-<number>.jpeg (then .jpg); then the stock
  // image the service shipped with.
  const heroSources = imageCandidates(
    service.heroImage,
    builtInServices.find((s) => s.slug === service.slug)?.heroImage,
    numberedPaths('/images/services', 'service-banner', service.number)
  )

  return (
    <section id={service.slug} className="scroll-mt-24 overflow-x-clip border-t border-brand-gold/15 bg-brand-black">
      <div className="mx-auto max-w-7xl">
        <div className="grid items-stretch lg:grid-cols-2">
          {/* Image — TOP on mobile (fades into text below), RIGHT on desktop (fades into text on its left) */}
          <motion.div
            className="relative order-1 min-h-[300px] sm:min-h-[400px] lg:order-2 lg:min-h-[580px]"
            initial={{ opacity: 0, scale: 1.04 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <FallbackImage
              candidates={heroSources}
              alt={service.title}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover"
            />
            {/* Smooth blend: bottom-fade on mobile, left-fade on desktop */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-brand-black to-transparent to-[42%] lg:bg-gradient-to-r lg:to-[52%]" />
          </motion.div>

          {/* Text — BELOW on mobile, LEFT on desktop (hero-style) */}
          <motion.div
            className="order-2 flex items-center px-4 pb-10 pt-5 md:px-6 lg:order-1 lg:py-16 lg:pr-10"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
          >
            <div className="max-w-xl">
              <h2 className="font-display text-3xl font-semibold leading-tight md:text-4xl lg:text-5xl">
                <span className="text-brand-gold-light">{num}.</span>{' '}
                <span className="text-white">{service.title.toUpperCase()}</span>
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-white/70 md:text-base">{service.intro}</p>

              <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {service.trustIcons.map((t) => (
                  <div key={t.label} className="flex flex-col items-center text-center">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full border border-brand-gold/50 text-brand-gold-light">
                      <ServiceIcon name={t.icon} />
                    </div>
                    <p className="mt-2 text-[10px] tracking-widest text-white/75">{t.label}</p>
                  </div>
                ))}
              </div>

              <div className="mt-8">
                {/* Carries the service through so the booking form opens on this one. */}
                <GoldButton to={`/book?service=${service.slug}`} className="w-full sm:w-auto">
                  RESERVE YOUR RIDE NOW
                </GoldButton>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Sub-services */}
        <div className="px-4 pb-14 pt-6 md:px-6 md:pb-20 md:pt-10">
          <SubServiceGrid items={service.subServices} serviceSlug={service.slug} />
        </div>
      </div>
    </section>
  )
}
