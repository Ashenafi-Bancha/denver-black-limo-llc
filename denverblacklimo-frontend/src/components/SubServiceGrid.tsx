import { ServiceIcon } from './ServiceIcon'
import type { SubService } from '../data/services'

export function SubServiceGrid({ items }: { items: SubService[] }) {
  return (
    <div>
      <div className="mb-10 flex items-center gap-4">
        <div className="h-px flex-1 bg-brand-gold/30" />
        <h2 className="font-display text-2xl tracking-wide text-brand-gold-light md:text-3xl">
          Sub-Services
        </h2>
        <div className="h-px flex-1 bg-brand-gold/30" />
      </div>
      <div
        className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${
          items.length >= 6 ? 'xl:grid-cols-6' : 'xl:grid-cols-5'
        }`}
      >
        {items.map((item) => (
          <article
            key={item.title}
            className="group overflow-hidden border border-brand-gold/20 bg-brand-surface transition hover:border-brand-gold/50"
          >
            <div className="relative aspect-[4/3] overflow-hidden">
              <img
                src={item.image}
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
