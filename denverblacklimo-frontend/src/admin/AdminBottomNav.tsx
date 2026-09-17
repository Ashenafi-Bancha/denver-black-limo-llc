import type { ReactNode } from 'react'

/**
 * The mobile navigation bar.
 *
 * Five destinations, not eight. A thumb reaching across a phone can hold about
 * five targets at a comfortable width, and the sections left out — Content,
 * Analytics, Customers — are the ones nobody opens while standing next to a
 * car. They stay one tap away in the drawer, which the More button opens.
 *
 * Hidden from desktop entirely: the sidebar is better there, and two navigation
 * systems on one screen is worse than either alone.
 */
export interface BottomNavItem<T extends string> {
  id: T
  label: string
  icon: ReactNode
  badge?: number
}

export function AdminBottomNav<T extends string>({
  items,
  active,
  onSelect,
  onMore,
}: {
  items: BottomNavItem<T>[]
  active: T
  onSelect: (id: T) => void
  onMore: () => void
}) {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-brand-black/95 backdrop-blur lg:hidden"
      // Keeps the row clear of the iPhone home indicator.
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="flex items-stretch">
        {items.map((item) => {
          const current = active === item.id
          return (
            <li key={item.id} className="flex-1">
              <button
                onClick={() => onSelect(item.id)}
                aria-current={current ? 'page' : undefined}
                // 56px of height, comfortably above the 44px minimum, and the
                // whole cell is the target rather than just the icon.
                className={`relative flex h-14 w-full flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${
                  current ? 'text-brand-gold' : 'text-white/50 active:text-white'
                }`}
              >
                {/* The current section is marked by a bar as well as colour, so
                    it is not carried by hue alone. */}
                <span
                  aria-hidden="true"
                  className={`absolute inset-x-3 top-0 h-0.5 rounded-b transition-colors ${
                    current ? 'bg-brand-gold' : 'bg-transparent'
                  }`}
                />
                <span className="relative">
                  {item.icon}
                  {Boolean(item.badge) && (
                    <span className="absolute -right-2 -top-1.5 min-w-[16px] rounded-full bg-brand-gold px-1 text-[9px] font-bold leading-4 text-brand-black">
                      {item.badge! > 9 ? '9+' : item.badge}
                    </span>
                  )}
                </span>
                <span className="tracking-wide">{item.label}</span>
              </button>
            </li>
          )
        })}
        <li className="flex-1">
          <button
            onClick={onMore}
            className="flex h-14 w-full flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-white/50 transition-colors active:text-white"
          >
            <span className="flex h-4 w-4 items-center justify-center">
              <span aria-hidden="true" className="text-base leading-none">&hellip;</span>
            </span>
            <span className="tracking-wide">More</span>
          </button>
        </li>
      </ul>
    </nav>
  )
}
