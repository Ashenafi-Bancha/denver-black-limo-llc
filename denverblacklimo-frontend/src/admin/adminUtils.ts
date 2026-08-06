/** Shared helpers for the admin dashboard: references, date handling and status styling. */
import { dateOnly, toLocalDate, fmtDate, fmtTime } from '../lib/datetime'

export { dateOnly, fmtDate, fmtTime }

/** Build a local Date from a booking's pickup date + time. Returns null when unparseable. */
export const pickupAt = toLocalDate


/** Same short reference the backend puts on confirmation emails, so admins can search what the customer quotes. */
export function bookingRef(id: string) {
  return `DBL-${String(id).replace(/-/g, '').slice(0, 6).toUpperCase()}`
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
