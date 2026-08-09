import { motion } from 'framer-motion'
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { CTABanner } from '../components/CTABanner'
import { ServiceSection } from '../components/ServiceSection'
import { aboutTrust, TrustRow } from '../components/TrustRow'
import { GoldButton, OutlineButton, PageHero, SectionHeading } from '../components/ui'
import { useSiteSettings } from '../context/SiteSettingsContext'
import { DEFAULT_PAGE_BANNERS, defaultServices, type PageBanners } from '../content/defaults'
import type { Service } from '../data/services'
import { IMAGES } from '../config/images'

export function ServicesPage() {
  const { hash } = useLocation()
  const { get } = useSiteSettings()
  const services = get<Service[]>('services', defaultServices)
  const banners = { ...DEFAULT_PAGE_BANNERS, ...get<Partial<PageBanners>>('page_banners', {}) }

  useEffect(() => {
    if (!hash) return
    const id = hash.replace('#', '')
    const scrollToSection = () => {
      const el = document.getElementById(id)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    requestAnimationFrame(() => {
      scrollToSection()
      window.setTimeout(scrollToSection, 100)
    })
  }, [hash])

  return (
    <>
      <PageHero
        eyebrow={banners.servicesEyebrow}
        title={banners.servicesTitle}
        subtitle={banners.servicesSubtitle}
        image={banners.servicesImage}
        fallback={IMAGES.hero1}
      >
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <GoldButton to="/book">RESERVE YOUR RIDE</GoldButton>
          <OutlineButton to="/quote">REQUEST A QUOTE</OutlineButton>
        </div>
      </PageHero>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <TrustRow items={aboutTrust} />

      <section className="border-b border-brand-gold/15 bg-brand-charcoal/50 py-12 md:py-14">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <SectionHeading>All Service Categories</SectionHeading>
          <p className="mx-auto mt-6 max-w-2xl text-center text-sm text-white/65 md:text-base">
            Scroll to explore every service we offer — from airport transfers and private aviation to
            weddings, mountain resorts, and group transportation.
          </p>
        </div>
      </section>

      {services.map((service) => (
        <ServiceSection key={service.slug} service={service} />
      ))}

        <CTABanner title="Reserve Your Ride Now" />
      </motion.div>
    </>
  )
}
