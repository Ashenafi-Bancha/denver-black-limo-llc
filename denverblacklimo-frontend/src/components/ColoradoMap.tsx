/**
 * Stylized-but-accurate Colorado state map.
 *
 * Colorado is a rectangle (37–41°N, 102–109°W); city positions below are the
 * real lat/lon projected into the viewBox, and the gold dashed lines trace the
 * real interstates (I-25 north–south, I-70 east–west, I-76 to the northeast).
 */

// Projected from real coordinates: x = (109 − lon)/7 × 136, y = (41 − lat)/4 × 100
const cities = [
  { name: 'Fort Collins', x: 76.2, y: 10.3, anchor: 'start' as const },
  { name: 'Boulder', x: 72.5, y: 24.7, anchor: 'end' as const },
  { name: 'Colorado Springs', x: 81.2, y: 54.2, anchor: 'start' as const },
  { name: 'Pueblo', x: 85.3, y: 68.7, anchor: 'start' as const },
  { name: 'Grand Junction', x: 8.7, y: 48.4, anchor: 'start' as const },
  { name: 'Vail', x: 51, y: 34, anchor: 'end' as const },
  { name: 'Aspen', x: 42.4, y: 45.3, anchor: 'end' as const },
]

export function ColoradoMap() {
  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-brand-gold/25 bg-brand-charcoal">
      <svg
        viewBox="0 0 136 100"
        className="h-auto w-full"
        aria-label="Colorado service coverage map"
        role="img"
      >
        <defs>
          <linearGradient id="co-bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#181818" />
            <stop offset="100%" stopColor="#0b0b0b" />
          </linearGradient>
          <filter id="gold-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* State outline — Colorado really is this rectangle */}
        <rect x="1.5" y="1.5" width="133" height="97" rx="2" fill="url(#co-bg)" stroke="rgba(212,175,55,0.55)" strokeWidth="1" />

        {/* Subtle lat/lon grid */}
        {[20, 40, 60, 80].map((y) => (
          <line key={`h${y}`} x1="2" y1={y} x2="134" y2={y} stroke="rgba(212,175,55,0.06)" strokeWidth="0.4" />
        ))}
        {[27, 54, 81, 108].map((x) => (
          <line key={`v${x}`} x1={x} y1="2" x2={x} y2="98" stroke="rgba(212,175,55,0.06)" strokeWidth="0.4" />
        ))}

        {/* Interstates */}
        {/* I-25: Wyoming → Fort Collins → Denver → Colorado Springs → Pueblo → New Mexico */}
        <path d="M 75.5 2 L 76.2 10.3 L 77.9 31.5 L 81.2 54.2 L 85.3 68.7 L 87.5 98" fill="none" stroke="rgba(212,175,55,0.4)" strokeWidth="0.9" strokeDasharray="2.5 1.6" />
        {/* I-70: Utah → Grand Junction → Vail → Denver → Kansas */}
        <path d="M 2 46 L 8.7 48.4 L 30 42 L 51 34 L 77.9 31.5 L 134 29" fill="none" stroke="rgba(212,175,55,0.4)" strokeWidth="0.9" strokeDasharray="2.5 1.6" />
        {/* I-76 toward the northeast corner */}
        <path d="M 77.9 31.5 L 105 14 L 134 6" fill="none" stroke="rgba(212,175,55,0.28)" strokeWidth="0.7" strokeDasharray="2.5 1.6" />

        {/* Bold state label */}
        <text x="22" y="84" fontSize="10" fontWeight="700" letterSpacing="2.6" fill="rgba(212,175,55,0.8)" fontFamily="Georgia, 'Times New Roman', serif">
          COLORADO
        </text>

        {/* Cities at their real positions */}
        {cities.map((c) => (
          <g key={c.name}>
            <circle cx={c.x} cy={c.y} r="1.6" fill="#d4af37" filter="url(#gold-glow)" />
            <text
              x={c.anchor === 'start' ? c.x + 3 : c.x - 3}
              y={c.y + 1.2}
              textAnchor={c.anchor}
              fontSize="4.2"
              fill="rgba(255,255,255,0.85)"
              fontFamily="Arial, Helvetica, sans-serif"
            >
              {c.name}
            </text>
          </g>
        ))}

        {/* Denver — highlighted with pulse + badge */}
        <g filter="url(#gold-glow)">
          <circle cx="77.9" cy="31.5" r="2.6" fill="#d4af37" />
          <circle cx="77.9" cy="31.5" r="4.6" fill="none" stroke="rgba(212,175,55,0.5)" strokeWidth="0.6">
            <animate attributeName="r" values="3;5.5;3" dur="2.4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.8;0.15;0.8" dur="2.4s" repeatCount="indefinite" />
          </circle>
        </g>
        <g>
          <rect x="84" y="26.2" width="24" height="9" rx="2" fill="#111111" stroke="rgba(212,175,55,0.7)" strokeWidth="0.5" />
          <text x="96" y="32.4" textAnchor="middle" fontSize="5" fontWeight="700" fill="#ffffff" fontFamily="Arial, Helvetica, sans-serif">
            Denver
          </text>
        </g>
      </svg>
    </div>
  )
}
