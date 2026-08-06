/**
 * Date/time formatting shared by the booking form and the admin dashboard.
 *
 * Two things to know about the inputs:
 * - `<input type="date">` gives `YYYY-MM-DD`, but Postgres `date` columns come back
 *   as full ISO timestamps, so both shapes have to be accepted.
 * - Parsing `YYYY-MM-DD` with `new Date()` treats it as UTC, which shifts the day
 *   backwards for anyone west of Greenwich — Denver included. Always build the
 *   Date from explicit parts instead.
 */

/** Reduce any accepted date shape to a plain `YYYY-MM-DD` calendar day. */
export function dateOnly(value?: string | null) {
  if (!value) return ''
  return value.includes('T') ? value.slice(0, 10) : value.trim()
}

/** Local Date from a calendar day plus optional `HH:MM`. Null when unparseable. */
export function toLocalDate(day?: string | null, time?: string | null) {
  const m = dateOnly(day).match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return null
  const [h, min] = (time || '00:00').split(':')
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(h) || 0, Number(min) || 0)
  return Number.isNaN(d.getTime()) ? null : d
}

/** "Tue, Aug 11, 2026". Unrecognised input is returned untouched rather than blanked. */
export function fmtDate(value?: string | null) {
  const d = toLocalDate(value)
  if (!d) return dateOnly(value) || '—'
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

/** "2:30 PM" from `HH:MM` or `HH:MM:SS`. */
export function fmtTime(value?: string | null) {
  if (!value) return ''
  const [h, m] = value.split(':')
  const hour = Number(h)
  if (Number.isNaN(hour)) return value
  const suffix = hour >= 12 ? 'PM' : 'AM'
  const display = hour % 12 === 0 ? 12 : hour % 12
  return `${display}:${(m || '00').padStart(2, '0')} ${suffix}`
}

/** "Tue, Aug 11, 2026 at 2:30 PM" — the customer-facing pairing. */
export function fmtDateTime(day?: string | null, time?: string | null) {
  const date = fmtDate(day)
  const clock = fmtTime(time)
  return clock ? `${date} at ${clock}` : date
}
