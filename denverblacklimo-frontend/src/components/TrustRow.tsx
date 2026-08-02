import { TrustIcon } from './ServiceIcon'

type TrustItem = { label: string; icon: string }

export function TrustRow({ items }: { items: TrustItem[] }) {
  return (
    <div className="border-b border-brand-gold/15 bg-brand-charcoal/80 py-10">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        {/* Slim badge strip — gold icons, white labels, gold dividers (no cards, no hover) */}
        <div className="grid grid-cols-2 gap-y-8 md:grid-cols-4">
          {items.map((item) => (
            <div
              key={item.label}
              className="flex flex-col items-center gap-3 border-brand-gold/25 px-3 text-center even:border-l md:even:border-l-0 md:[&:not(:first-child)]:border-l"
            >
              <span className="text-brand-gold-light">
                <TrustIcon name={item.icon} />
              </span>
              <p className="text-[11px] font-semibold leading-snug tracking-[0.18em] text-white">
                {item.label.toUpperCase()}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export const defaultTrust = [
  { label: 'Local Experts', icon: 'map-pin' },
  { label: 'Safe & Reliable', icon: 'shield' },
  { label: '24/7 Service', icon: 'clock' },
  { label: 'Premium Experience', icon: 'crown' },
]

export const aboutTrust = [
  { label: 'Professional Chauffeurs', icon: 'user' },
  { label: 'Safety & Reliability', icon: 'shield' },
  { label: '24/7 Availability', icon: 'clock' },
  { label: 'Luxury Experience', icon: 'crown' },
]
