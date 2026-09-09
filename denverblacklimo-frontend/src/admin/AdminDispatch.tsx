import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, Car, Check, ChevronDown, Loader2, MapPin, Send, X } from 'lucide-react'

/**
 * Assigning a chauffeur to a trip and emailing them the trip sheet.
 *
 * Trips are sometimes run by an outside driver who has no dashboard login, so
 * the email is the whole handover. The office picks from the drivers they have
 * used before — that list is built from past dispatches, so there is no
 * address book to maintain — or types a new one, and the fields fill in.
 *
 * The picker shows where each driver's day leaves them and whether they are
 * already spoken for at this hour. None of that is typed by anyone: it is read
 * back off the trips already assigned, so it cannot go stale the way a status
 * field someone has to remember to update always does.
 */

export interface DriverSummary {
  name: string
  email: string
  phone: string
  vehicle: string
  last_used: string | null
  /** Present only when the roster was measured against a particular trip. */
  status?: 'free' | 'working' | 'clash'
  /** Where the trip they run before this one drops off. */
  finishesPlace?: string | null
  finishesAt?: string | null
  /** What they are due on next, so a tight turnaround is visible in advance. */
  startsPlace?: string | null
  startsAt?: string | null
  /** The trip this one would collide with. */
  clashRef?: string | null
  clashAt?: string | null
}

export interface DispatchTarget {
  id: string
  reference: string
  customer: string
  pickup: string
  vehicle: string
  driverName?: string | null
  driverEmail?: string | null
  driverPhone?: string | null
  driverVehicle?: string | null
  driverPay?: string | null
  driverNotes?: string | null
  dispatchedAt?: string | null
}

const FIELD =
  'w-full rounded border border-white/10 bg-brand-black px-4 py-3 text-sm text-white outline-none transition-colors focus:border-brand-gold'
const LABEL = 'mb-2 block text-xs font-semibold uppercase tracking-widest text-brand-gold/80'

/**
 * Times arrive already formatted, and are printed exactly as sent. A pick-up
 * time is a wall clock in Denver with no zone attached, so parsing it back
 * into a Date here would shift it into whatever zone this browser is in.
 */
const at = (time?: string | null) => time || ''

/**
 * The one line under a driver's name. It answers the only question the office
 * is actually asking: can this person be where the passenger is, on time?
 */
function whereabouts(d: DriverSummary): string {
  if (d.status === 'clash') return `Already on ${d.clashRef} at ${at(d.clashAt)}`
  if (d.finishesPlace) return `Finishes ${d.finishesPlace} · ${at(d.finishesAt)}`
  if (d.finishesAt) return `Finishes a trip at ${at(d.finishesAt)}`
  if (d.startsPlace) return `Free until ${at(d.startsAt)}, then ${d.startsPlace}`
  if (d.startsAt) return `Free until ${at(d.startsAt)}`
  if (d.status) return 'Nothing else booked that day'
  return d.vehicle || ''
}

const STATUS_STYLE: Record<string, string> = {
  free: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  working: 'border-sky-500/40 bg-sky-500/10 text-sky-300',
  clash: 'border-red-500/40 bg-red-500/10 text-red-300',
}
const STATUS_TEXT: Record<string, string> = { free: 'Free', working: 'Working', clash: 'Clash' }

/**
 * Best candidates first: free, then already working, then anyone this trip
 * would double-book. Within a group the most recently used comes first, which
 * is usually the office's own preference order.
 */
export function useSortedDrivers(drivers: DriverSummary[]) {
  return useMemo(() => {
    const rank = (d: DriverSummary) => (d.status === 'clash' ? 2 : d.status === 'working' ? 1 : 0)
    return [...drivers].sort(
      (a, b) =>
        rank(a) - rank(b) ||
        new Date(b.last_used || 0).getTime() - new Date(a.last_used || 0).getTime()
    )
  }, [drivers])
}

/** The roster, as a dropdown that says where everyone is. */
function DriverPicker({
  drivers,
  selectedEmail,
  onPick,
}: {
  drivers: DriverSummary[]
  selectedEmail: string
  onPick: (d: DriverSummary) => void
}) {
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)
  const sorted = useSortedDrivers(drivers)
  const selected = sorted.find((d) => d.email.toLowerCase() === selectedEmail.trim().toLowerCase())

  // Escape closes, and so does a click anywhere else — the panel behind this
  // one is a form, and trapping the office inside a dropdown would be rude.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDown)
    }
  }, [open])

  if (!drivers.length) return null

  return (
    <div ref={boxRef} className="relative">
      <span className={LABEL}>Choose a driver</span>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`${FIELD} flex items-center justify-between gap-3 text-left focus-visible:border-brand-gold`}
      >
        <span className="min-w-0 flex-1">
          {selected ? (
            <>
              <span className="block truncate text-white">{selected.name || selected.email}</span>
              <span className="block truncate text-xs text-white/45">{whereabouts(selected)}</span>
            </>
          ) : (
            <span className="text-white/40">Pick from drivers you have used</span>
          )}
        </span>
        {selected?.status && (
          <span
            className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
              STATUS_STYLE[selected.status]
            }`}
          >
            {STATUS_TEXT[selected.status]}
          </span>
        )}
        <ChevronDown className={`h-4 w-4 shrink-0 text-white/40 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <motion.ul
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          role="listbox"
          className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded border border-white/15 bg-brand-black shadow-2xl"
        >
          {sorted.map((d) => {
            const isSelected = d.email.toLowerCase() === selectedEmail.trim().toLowerCase()
            return (
              <li key={d.email}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onPick(d)
                    setOpen(false)
                  }}
                  className="flex w-full items-start gap-3 border-b border-white/5 px-4 py-3 text-left transition-colors last:border-0 hover:bg-white/5 focus-visible:bg-white/5 focus-visible:outline-none"
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      {d.status === 'clash' && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-400" />}
                      <span className="truncate text-sm text-white">{d.name || d.email}</span>
                    </span>
                    <span
                      className={`mt-0.5 flex items-center gap-1 text-xs ${
                        d.status === 'clash' ? 'text-red-300/80' : 'text-white/45'
                      }`}
                    >
                      {d.status !== 'clash' && (d.finishesPlace || d.startsPlace) && (
                        <MapPin className="h-3 w-3 shrink-0" />
                      )}
                      <span className="truncate">{whereabouts(d)}</span>
                    </span>
                  </span>
                  {d.status && (
                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        STATUS_STYLE[d.status]
                      }`}
                    >
                      {STATUS_TEXT[d.status]}
                    </span>
                  )}
                  {isSelected && <Check className="h-4 w-4 shrink-0 text-brand-gold" />}
                </button>
              </li>
            )
          })}
        </motion.ul>
      )}
      <p className="mt-1.5 text-xs text-white/40">
        Or type someone new below — an outside chauffeur does not have to be on this list.
      </p>
    </div>
  )
}

export function DispatchModal({
  target,
  drivers,
  busy,
  error,
  onClose,
  onSend,
}: {
  target: DispatchTarget
  drivers: DriverSummary[]
  busy: boolean
  error: string
  onClose: () => void
  onSend: (payload: {
    driverName: string
    driverEmail: string
    driverPhone: string
    vehicle: string
    pay: string
    notes: string
  }) => void
}) {
  // Re-sending keeps whoever was assigned; a fresh assignment starts empty.
  const [name, setName] = useState(target.driverName || '')
  const [email, setEmail] = useState(target.driverEmail || '')
  const [phone, setPhone] = useState(target.driverPhone || '')
  const [vehicle, setVehicle] = useState(target.driverVehicle || target.vehicle || '')
  const [pay, setPay] = useState(target.driverPay || '')
  const [notes, setNotes] = useState(target.driverNotes || '')

  /** Picking a driver fills the rest of their details in. */
  const applyDriver = (d: DriverSummary) => {
    setName(d.name || '')
    setEmail(d.email || '')
    setPhone(d.phone || '')
    if (d.vehicle) setVehicle(d.vehicle)
  }

  // Typing an email that matches someone we have used before does the same.
  useEffect(() => {
    const match = drivers.find((d) => d.email.toLowerCase() === email.trim().toLowerCase())
    if (match && !name.trim()) applyDriver(match)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email])

  const chosen = drivers.find((d) => d.email.toLowerCase() === email.trim().toLowerCase())
  const valid = name.trim().length > 1 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-xl border border-white/10 bg-brand-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-white/10 bg-brand-black/50 p-5">
          <div>
            <h2 className="flex items-center gap-2 font-display text-lg text-brand-gold">
              <Car className="h-5 w-5" /> {target.dispatchedAt ? 'Re-send trip sheet' : 'Assign a driver'}
            </h2>
            <p className="mt-0.5 text-xs text-white/50">
              {target.reference} &middot; {target.customer} &middot; {target.pickup}
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded p-1 text-white/40 transition-colors hover:bg-white/10 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 p-6">
          <DriverPicker drivers={drivers} selectedEmail={email} onPick={applyDriver} />

          {/* Selecting a clashing driver is allowed — the office may know the
              earlier trip is short, or cancelled in all but name — but it is
              never allowed to happen quietly. */}
          {chosen?.status === 'clash' && (
            <div className="flex items-start gap-2.5 rounded border border-red-500/40 bg-red-500/10 p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
              <p className="text-xs leading-relaxed text-red-200">
                <b>{chosen.name}</b> is already on {chosen.clashRef} at {at(chosen.clashAt)}. Send this
                only if you know the two trips do not overlap.
              </p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={LABEL}>Driver name *</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className={FIELD} placeholder="Full name" />
            </div>
            <div>
              <label className={LABEL}>Driver phone</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className={FIELD} placeholder="(720) 555-0110" />
            </div>
          </div>

          <div>
            <label className={LABEL}>Driver email *</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={FIELD}
              placeholder="driver@example.com"
              type="email"
            />
            <p className="mt-1.5 text-xs text-white/40">The trip sheet is sent here.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={LABEL}>Vehicle</label>
              <input value={vehicle} onChange={(e) => setVehicle(e.target.value)} className={FIELD} placeholder="Cadillac Escalade ESV" />
            </div>
            <div>
              <label className={LABEL}>Driver pay</label>
              <input value={pay} onChange={(e) => setPay(e.target.value)} className={FIELD} placeholder="$120 flat, or 70%" />
            </div>
          </div>

          <div>
            <label className={LABEL}>Notes for the driver</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className={`${FIELD} resize-none`}
              placeholder="Staging, entrance, who to meet, anything they would otherwise have to phone about."
            />
            <p className="mt-1.5 text-xs text-white/40">
              The passenger's own requests are already on the sheet — this is for dispatch instructions.
            </p>
          </div>

          {error && <p className="text-sm font-medium text-red-400">{error}</p>}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button onClick={onClose} className="rounded border border-white/15 px-5 py-3 text-sm text-white/70 transition hover:text-white">
              Cancel
            </button>
            <button
              onClick={() => onSend({ driverName: name.trim(), driverEmail: email.trim(), driverPhone: phone.trim(), vehicle: vehicle.trim(), pay: pay.trim(), notes: notes.trim() })}
              disabled={!valid || busy}
              className="inline-flex items-center justify-center gap-2 rounded bg-gold-gradient px-6 py-3 text-sm font-bold uppercase tracking-widest text-brand-black transition disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {target.dispatchedAt ? 'Re-send' : 'Send trip sheet'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
