import { Link, useParams } from 'react-router-dom'
import { Check } from 'lucide-react'
import { CTABanner } from '../components/CTABanner'
import { ServiceIcon } from '../components/ServiceIcon'
import { defaultTrust, TrustRow } from '../components/TrustRow'
import { GoldButton, OutlineButton } from '../components/ui'
import { getServiceAreaBySlug } from '../data/serviceAreas'
import { subServiceSlug } from '../data/services'
import { PHONE, PHONE_HREF } from '../constants'

export function ServiceAreaDetailPage() {
  const { slug } = useParams()
  const area = slug ? getServiceAreaBySlug(slug) : undefined

  if (!area) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-24 text-center">
        <h1 className="font-display text-3xl">Region not found</h1>
        <Link to="/service-areas" className="mt-4 inline-block text-brand-gold-light">
          View all areas
        </Link>
      </div>
    )
  }

  return (
    <>
      <section className="relative min-h-[50vh] overflow-hidden">
        <img
          src={`/images/service-areas/area-banner-${area.number}.jpeg`}
          alt={area.title}
          className="absolute inset-0 h-full w-full object-cover"
          onError={(e) => {
            const t = e.currentTarget
            const step = t.dataset.step
            if (!step) {
              t.dataset.step = 'jpg'
              t.src = `/images/service-areas/area-banner-${area.number}.jpg`
            } else if (step === 'jpg') {
              t.dataset.step = 'stock'
              t.src = area.heroImage
            }
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-black via-brand-black/60 to-brand-black/30" />
        <div className="relative mx-auto max-w-7xl px-4 pb-10 pt-28 md:px-6">
          <p className="text-xs tracking-[0.3em] text-brand-gold-light">SERVICE AREAS</p>
          <h1 className="mt-2 font-display text-4xl text-white md:text-5xl">
            {area.number}. {area.title.toUpperCase()}
          </h1>
          <p className="mt-3 max-w-2xl text-lg text-white/80">{area.subtitle}</p>
        </div>
      </section>

      <TrustRow items={defaultTrust} />

      <section className="mx-auto max-w-7xl px-4 py-16 md:px-6">
        <div className="grid gap-10 lg:grid-cols-2">
          <div className="border border-brand-gold/25 bg-brand-surface p-6 md:p-8">
            <h2 className="font-display text-2xl text-brand-gold-light">Coverage Areas</h2>
            <p className="mt-3 text-sm text-white/65">{area.intro}</p>
            <ul className="mt-6 grid gap-2 sm:grid-cols-2">
              {area.coverageAreas.map((c) => (
                <li key={c} className="flex items-center gap-2 text-sm text-white/80">
                  <Check className="h-4 w-4 text-brand-gold-light" />
                  {c}
                </li>
              ))}
            </ul>
          </div>
          <div className="overflow-hidden border border-brand-gold/25">
            <img
              src={`/images/service-areas/area-side-${area.number}.jpeg`}
              alt={`${area.title} landscape`}
              loading="lazy"
              className="h-full min-h-[280px] w-full object-cover"
              onError={(e) => {
                const t = e.currentTarget
                const step = t.dataset.step
                if (!step) {
                  t.dataset.step = 'jpg'
                  t.src = `/images/service-areas/area-side-${area.number}.jpg`
                } else if (step === 'jpg') {
                  t.dataset.step = 'stock'
                  t.src = area.mapImage
                }
              }}
            />
          </div>
        </div>

        <div className="mt-16 flex items-center gap-4">
          <div className="h-px flex-1 bg-brand-gold/30" />
          <h2 className="text-center font-display text-xl text-brand-gold-light md:text-2xl">
            What We Offer in {area.title}
          </h2>
          <div className="h-px flex-1 bg-brand-gold/30" />
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {area.offers.map((offer) => (
            <article key={offer.title} className="overflow-hidden border border-brand-gold/20 bg-brand-charcoal">
              <img
                src={`/images/service-areas/${area.slug}/${subServiceSlug(offer.title)}.jpeg`}
                alt={offer.title}
                loading="lazy"
                className="aspect-[4/3] w-full object-cover"
                onError={(e) => {
                  const t = e.currentTarget
                  const step = t.dataset.step
                  if (!step) {
                    t.dataset.step = 'jpg'
                    t.src = `/images/service-areas/${area.slug}/${subServiceSlug(offer.title)}.jpg`
                  } else if (step === 'jpg') {
                    t.dataset.step = 'stock'
                    t.src = offer.image
                  }
                }}
              />
              <div className="p-4 text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-brand-gold/50 text-brand-gold-light">
                  <ServiceIcon name={offer.icon} className="h-5 w-5" />
                </div>
                <h3 className="mt-3 font-display text-lg text-brand-gold-light">{offer.title}</h3>
                <p className="mt-2 text-xs text-white/60">{offer.description}</p>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border border-brand-gold/25 bg-brand-surface p-6 md:flex-row md:p-8">
          <div>
            <p className="text-xs tracking-widest text-brand-gold-light">NEED A RIDE IN {area.title.toUpperCase()}?</p>
            <p className="mt-2 text-sm text-white/70">Luxury transportation wherever life takes you.</p>
            <a href={PHONE_HREF} className="mt-3 inline-block font-display text-2xl text-brand-gold-light">
              {PHONE}
            </a>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <GoldButton to="/book">RESERVE A RIDE</GoldButton>
            <OutlineButton to="/quote">REQUEST A QUOTE</OutlineButton>
          </div>
        </div>
      </section>
      <CTABanner />
    </>
  )
}
