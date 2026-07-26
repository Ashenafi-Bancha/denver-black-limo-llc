import { motion } from 'framer-motion'
import { CTABanner } from '../components/CTABanner'
import { PageHero } from '../components/ui'
import { useSiteSettings } from '../context/SiteSettingsContext'
import { defaultFleet } from '../content/defaults'
import type { FleetVehicle } from '../data/fleet'
import { IMAGES } from '../config/images'

export function FleetPage() {
  const { get } = useSiteSettings()
  const fleet = get<FleetVehicle[]>('fleet', defaultFleet)
  return (
    <>
      <PageHero
        eyebrow="Our Fleet"
        title="Luxury Vehicles for Every Occasion"
        subtitle="Immaculate black luxury sedans, SUVs, limousines, sprinter vans, and party buses — maintained to the highest standards for comfort, safety, and presence."
        image={IMAGES.hero1}
      />
      <section className="mx-auto max-w-7xl px-4 py-16 md:px-6">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {fleet.map((vehicle, index) => (
            <motion.article
              key={vehicle.id}
              className="overflow-hidden border border-brand-gold/25 bg-brand-surface transition hover:border-brand-gold/50"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1, ease: "easeOut" }}
            >
              <div className="aspect-[16/10] overflow-hidden">
                <motion.img
                  src={vehicle.image}
                  alt={vehicle.name}
                  loading="lazy"
                  className="h-full w-full object-cover"
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                />
              </div>
              <div className="p-6">
                <p className="text-xs tracking-widest text-brand-gold/80">{vehicle.type.toUpperCase()}</p>
                <h2 className="mt-1 font-display text-2xl text-brand-gold-light">{vehicle.name}</h2>
                <p className="mt-1 text-sm text-brand-gold/90">{vehicle.capacity}</p>
                <p className="mt-3 text-sm leading-relaxed text-white/65">{vehicle.description}</p>
              </div>
            </motion.article>
          ))}
        </div>
      </section>
      <CTABanner title="Reserve the Perfect Vehicle" />
    </>
  )
}
