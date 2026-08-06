/** Shared helpers for the admin dashboard: references, date handling and status styling. */

/** Same short reference the backend puts on confirmation emails, so admins can search what the customer quotes. */
export function bookingRef(id: string) {
  return `DBL-${String(id).replace(/-/g, '').slice(0, 6).toUpperCase()}`
}

/** Postgres `date` columns arrive as ISO timestamps; keep just the calendar day. */
export function dateOnly(value?: string | null) {
  if (!value) return ''
  return value.includes('T') ? value.slice(0, 10) : value.trim()
}

/** Build a local Date from a booking's pickup date + time. Returns null when unparseable. */
export function pickupAt(pickupDate?: string | null, pickupTime?: string | null) {
  const day = dateOnly(pickupDate)
  const m = day.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return null
  const [h, min] = (pickupTime || '00:00').split(':')
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(h) || 0, Number(min) || 0)
  return Number.isNaN(d.getTime()) ? null : d
}

export function fmtDate(value?: string | null) {
  const day = dateOnly(value)
  const m = day.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return day || '—'
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function fmtTime(value?: string | null) {
  if (!value) return ''
  const [h, m] = value.split(':')
  const hour = Number(h)
  if (Number.isNaN(hour)) return value
  const suffix = hour >= 12 ? 'PM' : 'AM'
  const display = hour % 12 === 0 ? 12 : hour % 12
  return `${display}:${(m || '00').padStart(2, '0')} ${suffix}`
}

/** Calendar days from today: 0 = today, 1 = tomorrow, negative = past. */
export function daysFromToday(target: Date) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const day = new Date(target)
  day.setHours(0, 0, 0, 0)
  return Math.round((day.getTime() - today.getTime()) / 86_400_000)
}

/** "Today", "Tomorrow", "In 4 days", "3 days ago" — the phrasing an operator scans for. */
export function relativeDay(target: Date) {
  const diff = daysFromToday(target)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  return diff > 0 ? `In ${diff} days` : `${Math.abs(diff)} days ago`
}

/** A pickup less than `hours` away still needs dispatching — mirrors the email short-notice banner. */
export function isShortNotice(at: Date | null, hours = 3) {
  if (!at) return false
  const ms = at.getTime() - Date.now()
  return ms > 0 && ms < hours * 3600 * 1000
}

export const BOOKING_STATUSES = ['Pending', 'Reviewed', 'Quoted', 'Confirmed', 'Completed', 'Cancelled'] as const
export const INQUIRY_STATUSES = ['New', 'Read', 'Replied', 'Closed'] as const

/** Distinct colour per status — previously everything except Pending rendered identically green. */
export const STATUS_STYLES: Record<string, string> = {
  Pending: 'bg-brand-gold/20 text-brand-gold border-brand-gold/40',
  Reviewed: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
  Quoted: 'bg-violet-500/20 text-violet-300 border-violet-500/40',
  Confirmed: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  Completed: 'bg-white/10 text-white/60 border-white/20',
  Cancelled: 'bg-red-500/20 text-red-300 border-red-500/40',
  New: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  Read: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
  Replied: 'bg-violet-500/20 text-violet-300 border-violet-500/40',
  Closed: 'bg-white/10 text-white/60 border-white/20',
}

export function statusStyle(status: string) {
  return STATUS_STYLES[status] || 'bg-white/10 text-white/60 border-white/20'
}

/** Case-insensitive match across every field an admin might search by. */
export function matchesQuery(haystack: (string | null | undefined)[], query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return haystack.filter(Boolean).join(' ').toLowerCase().includes(q)
}
