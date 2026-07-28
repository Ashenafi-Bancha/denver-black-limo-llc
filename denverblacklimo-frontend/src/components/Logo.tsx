import { Link } from 'react-router-dom'
import { IMAGES } from '../config/images'

type LogoProps = {
  compact?: boolean
  className?: string
  iconOnly?: boolean
}

export function Logo({ compact = false, className = '', iconOnly = false }: LogoProps) {
  return (
    <Link to="/" className={`group flex items-center gap-2 md:gap-3 ${className}`}>
      <img
        src={IMAGES.logo}
        alt="Denver Black Limo LLC logo"
        className={`rounded-full object-cover ring-1 ring-brand-gold/40 transition group-hover:ring-brand-gold/70 ${
          compact ? 'h-8 w-8 md:h-10 md:w-10' : 'h-10 w-10 md:h-14 md:w-14'
        }`}
        onError={(e) => {
          // Gracefully fall back to the previous logo asset if the new one is missing.
          if (!e.currentTarget.src.endsWith('/images/logo.webp')) {
            e.currentTarget.src = '/images/logo.webp'
          }
        }}
      />
      {!iconOnly && (
        <div className={`flex flex-col ${compact ? 'hidden md:flex' : 'flex'}`}>
          <p className="font-display text-[11px] font-semibold tracking-[0.15em] text-brand-gold-light sm:text-sm md:tracking-[0.18em]">
            DENVER BLACK LIMO LLC
          </p>
        </div>
      )}
    </Link>
  )
}
