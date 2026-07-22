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
              className="group flex flex-col items-center justify-center text-center p-6 rounded-2xl bg-brand-surface/40 border border-brand-gold/15 transition-all duration-300 hover:-translate-y-1 hover:border-brand-gold/60 hover:shadow-[0_0_20px_rgba(212,175,55,0.25)] hover:bg-brand-surface"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-brand-gold/40 text-brand-gold-light transition-all duration-300 group-hover:scale-110 group-hover:bg-brand-gold/10">
                <TrustIcon name={item.icon} />
              </div>
              <p className="mt-4 text-[11px] font-semibold tracking-[0.18em] text-brand-gold-light transition-colors group-hover:text-white">
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
