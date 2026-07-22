const locations = [
  { name: 'Fort Collins', x: 42, y: 18 },
  { name: 'Denver', x: 48, y: 42 },
  { name: 'Boulder', x: 44, y: 32 },
  { name: 'Colorado Springs', x: 52, y: 58 },
  { name: 'Grand Junction', x: 8, y: 48 },
  { name: 'Vail', x: 38, y: 28 },
  { name: 'Aspen', x: 28, y: 38 },
]

export function ColoradoMap() {
  return (
    <div className="relative aspect-square w-full overflow-hidden border border-brand-gold/25 bg-brand-charcoal">
      <svg
        viewBox="0 0 100 100"
        className="h-full w-full"
        aria-label="Colorado service coverage map"
        role="img"
      >
        <defs>
          <linearGradient id="co-bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1a1a1a" />
            <stop offset="100%" stopColor="#0a0a0a" />
          </linearGradient>
          <filter id="gold-glow">
            <feGaussianBlur stdDeviation="0.8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect width="100" height="100" fill="url(#co-bg)" />

        {/* Stylized Colorado outline */}
        <path
          d="M18 8 L38 6 L52 10 L68 8 L82 14 L88 28 L92 44 L90 62 L84 78 L72 88 L58 92 L42 90 L28 84 L16 72 L10 56 L8 38 L12 22 Z"
          fill="#141414"
          stroke="rgba(212,175,55,0.35)"
          strokeWidth="0.4"
        />

        {/* Mountain range accent */}
        <path
          d="M12 38 L22 28 L32 34 L42 22 L52 30 L62 20 L72 28 L82 24 L88 32"
          fill="none"
          stroke="rgba(212,175,55,0.2)"
          strokeWidth="0.3"
        />

        {/* Connection lines */}
        {locations.slice(0, 4).map((loc, i) => {
          const next = locations[(i + 1) % 4]
          return (
            <line
              key={`line-${loc.name}`}
              x1={loc.x}
              y1={loc.y}
              x2={next.x}
              y2={next.y}
              stroke="rgba(212,175,55,0.12)"
              strokeWidth="0.2"
              strokeDasharray="1 1"
            />
          )
        })}

        {locations.map((loc) => (
          <g key={loc.name} filter="url(#gold-glow)">
            <circle cx={loc.x} cy={loc.y} r="2.2" fill="#d4af37" opacity="0.9" />
            <circle cx={loc.x} cy={loc.y} r="4" fill="none" stroke="#d4af37" strokeWidth="0.25" opacity="0.5" />
            <text
              x={loc.x}
              y={loc.y - 4}
              textAnchor="middle"
              fill="#d4af37"
              fontSize="3.2"
              fontFamily="Inter, sans-serif"
              fontWeight="500"
              letterSpacing="0.05em"
            >
              {loc.name.toUpperCase()}
            </text>
          </g>
        ))}
      </svg>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-brand-black/90 to-transparent px-4 pb-4 pt-8">
        <p className="text-center font-display text-sm tracking-widest text-brand-gold-light">
          STATEWIDE COVERAGE
        </p>
      </div>
    </div>
  )
}
