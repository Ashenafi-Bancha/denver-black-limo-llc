import { Link } from 'react-router-dom'

type LogoProps = {
  compact?: boolean
  className?: string
}

export function Logo({ compact = false, className = '' }: LogoProps) {
  return (
    <Link to="/" className={`group flex items-center gap-2 md:gap-3 ${className}`}>
      <img
        src="/images/logo.jpg"
        alt="Denver Black Limo LLC logo"
        className={`rounded-full object-cover ring-1 ring-brand-gold/40 transition group-hover:ring-brand-gold/70 ${
          compact ? 'h-8 w-8 md:h-10 md:w-10' : 'h-10 w-10 md:h-14 md:w-14'
        }`}
        onError={(e) => {
          e.currentTarget.src = 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=100&auto=format&fit=crop&q=80'
        }}
      />
      <div className={`flex flex-col ${compact ? 'hidden md:flex' : 'flex'}`}>
        <p className="font-display text-[11px] font-semibold tracking-[0.15em] text-brand-gold-light sm:text-sm md:tracking-[0.18em]">
          DENVER BLACK LIMO
        </p>
        <p className="text-[8px] tracking-[0.15em] text-white/70 sm:text-[10px] md:tracking-[0.22em]">
          LUXURY CHAUFFEURED TRANSPORTATION
        </p>
      </div>
    </Link>
  )
}
