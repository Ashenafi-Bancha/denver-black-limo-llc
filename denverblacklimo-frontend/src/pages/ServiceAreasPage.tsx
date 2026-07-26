import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight, Check } from 'lucide-react'
import { CTABanner } from '../components/CTABanner'
import { PageHero } from '../components/ui'
import { serviceAreas } from '../data/serviceAreas'
import { IMAGES } from '../config/images'

export function ServiceAreasPage() {
  return (
    <>
      <PageHero
        eyebrow="Coverage"
        title="Service Areas"
        subtitle="Premium chauffeured transportation across Denver, the Front Range, mountain resorts, and key destinations throughout Colorado."
        image={IMAGES.hero1}
      />
      <section className="mx-auto max-w-7xl px-4 py-16 md:px-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {serviceAreas.map((area, index) => (
            <motion.div
              key={area.slug}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1, ease: "easeOut" }}
            >
              <Link
                to={`/service-areas/${area.slug}`}
                className="group overflow-hidden border border-brand-gold/25 bg-brand-surface"
              >
                <div className="aspect-[16/10] overflow-hidden">
                  <motion.img
                    src={area.heroImage}
                    alt={area.title}
                    loading="lazy"
                    className="h-full w-full object-cover"
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.4, ease: "easeInOut" }}
                  />
                </div>
                <div className="p-5">
                  <p className="text-xs tracking-widest text-brand-gold/80">REGION {area.number}</p>
                  <h2 className="mt-1 font-display text-xl text-brand-gold-light">{area.title}</h2>
                  <p className="mt-2 text-sm text-white/60">{area.subtitle}</p>
                  <ul className="mt-4 space-y-1">
                    {area.coverageAreas.slice(0, 4).map((c) => (
                      <li key={c} className="flex items-center gap-2 text-xs text-white/70">
                        <Check className="h-3 w-3 text-brand-gold-light" />
                        {c}
                      </li>
                    ))}
                  </ul>
                  <span className="mt-4 inline-flex items-center gap-1 text-xs tracking-widest text-brand-gold-light">
                    EXPLORE <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>
      <CTABanner title="Need a Ride Anywhere in Colorado?" />
    </>
  )
}
