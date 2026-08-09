import { ServiceIcon } from './ServiceIcon'
import { FallbackImage } from './FallbackImage'
import { imageCandidates } from '../lib/imageSource'
import { services as builtInServices, subServiceSlug, type SubService } from '../data/services'

/** What this sub-service's photo was before anyone edited it in the admin. */
function builtInSubServiceImage(serviceSlug: string, title: string) {
  return builtInServices
    .find((s) => s.slug === serviceSlug)
    ?.subServices.find((sub) => sub.title === title)?.image
}

/**
 * Widest (xl) column count chosen to keep rows balanced for each sub-service
 * count — e.g. 8 cards render as 4×2 instead of an awkward 6+2. All classes are
 * spelled out literally so Tailwind's scanner includes them.
 */
const XL_COLS: Record<number, string> = {
  1: 'xl:grid-cols-1',
  2: 'xl:grid-cols-2',
  3: 'xl:grid-cols-3',
  4: 'xl:grid-cols-4',
  5: 'xl:grid-cols-5',
  6: 'xl:grid-cols-6',
  7: 'xl:grid-cols-4',
  8: 'xl:grid-cols-4',
  9: 'xl:grid-cols-3',
  10: 'xl:grid-cols-5',
  11: 'xl:grid-cols-4',
  12: 'xl:grid-cols-4',
}

export function SubServiceGrid({ items, serviceSlug }: { items: SubService[]; serviceSlug: string }) {
  const xlCols = XL_COLS[items.length] ?? 'xl:grid-cols-4'
  return (
    <div>
      <div className="mb-10 flex items-center gap-4">
        <div className="h-px flex-1 bg-brand-gold/30" />
        <h2 className="font-display text-2xl tracking-wide text-brand-gold-light md:text-3xl">
          Sub-Services
        </h2>
        <div className="h-px flex-1 bg-brand-gold/30" />
      </div>
      <div className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${xlCols}`}>
        {items.map((item) => (
          <article
            key={item.title}
            className="group overflow-hidden border border-brand-gold/20 bg-brand-surface transition hover:border-brand-gold/50"
          >
            <div className="relative aspect-[4/3] overflow-hidden">
              <FallbackImage
                candidates={imageCandidates(
                  item.image,
                  builtInSubServiceImage(serviceSlug, item.title),
                  [
                    `/images/services/${serviceSlug}/${subServiceSlug(item.title)}.jpeg`,
                    `/images/services/${serviceSlug}/${subServiceSlug(item.title)}.jpg`,
                  ]
                )}
                alt={item.title}
                loading="lazy"
                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-brand-black via-transparent to-transparent" />
              <div className="absolute bottom-3 left-1/2 flex h-11 w-11 -translate-x-1/2 items-center justify-center rounded-full border border-brand-gold/60 bg-brand-black/70 text-brand-gold-light">
                <ServiceIcon name={item.icon} className="h-5 w-5" />
              </div>
            </div>
            <div className="p-4">
              <h3 className="text-center font-display text-sm font-semibold tracking-wider text-brand-gold-light">
                {item.title.toUpperCase()}
              </h3>
              <p className="mt-2 text-center text-xs leading-relaxed text-white/65">
                {item.description}
              </p>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
