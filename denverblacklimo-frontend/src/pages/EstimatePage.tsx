import { CTABanner } from '../components/CTABanner'
import { PriceEstimator } from '../components/PriceEstimator'
import { PageHero } from '../components/ui'
import { IMAGES } from '../config/images'

export function EstimatePage() {
  return (
    <>
      <PageHero
        eyebrow="Instant Pricing"
        title="See your price before you book"
        subtitle="Tell us where you are going and which vehicle you would like. No waiting for a callback."
        image="/images/services/services-hero.jpeg"
        fallback={IMAGES.hero1}
      />

      <section className="mx-auto max-w-7xl px-4 py-14 md:px-6 md:py-20">
        <PriceEstimator />
      </section>

      <CTABanner title="Prefer to talk it through?" />
    </>
  )
}
