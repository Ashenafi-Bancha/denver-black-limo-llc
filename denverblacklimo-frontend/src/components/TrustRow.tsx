import { TrustIcon } from './ServiceIcon'

type TrustItem = { label: string; icon: string }

export function TrustRow({ items }: { items: TrustItem[] }) {
  return (
    <div className="bg-brand-charcoal/80 py-12">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
          {items.map((item) => (
            <div
              key={item.label}
              className="flex flex-col items-center justify-center rounded-2xl border border-white/15 bg-brand-surface/40 p-6 text-center"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/40 text-white">
                <TrustIcon name={item.icon} />
              </div>
              <p className="mt-4 text-[11px] font-semibold tracking-[0.18em] text-white">
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
