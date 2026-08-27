import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Car, Loader2, Send, X } from 'lucide-react'

/**
 * Assigning a chauffeur to a trip and emailing them the trip sheet.
 *
 * Trips are sometimes run by an outside driver who has no dashboard login, so
 * the email is the whole handover. The office picks a driver they have used
 * before — that list is built from past dispatches, so there is no address
 * book to maintain — or types a new one, and the fields fill themselves in.
 */

export interface DriverSummary {
  name: string
  email: string
  phone: string
  vehicle: string
  last_used: string | null
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

  /** Picking a remembered driver fills the rest of their details in. */
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
          {drivers.length > 0 && (
            <div>
              <span className={LABEL}>Drivers you have used</span>
              <div className="flex flex-wrap gap-2">
                {drivers.slice(0, 6).map((d) => (
                  <button
                    key={d.email}
                    type="button"
                    onClick={() => applyDriver(d)}
                    className={`rounded-full border px-3 py-1.5 text-xs transition ${
                      d.email.toLowerCase() === email.trim().toLowerCase()
                        ? 'border-brand-gold bg-brand-gold/15 text-brand-gold-light'
                        : 'border-white/15 text-white/70 hover:border-brand-gold/50 hover:text-white'
                    }`}
                  >
                    {d.name || d.email}
                  </button>
                ))}
              </div>
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

/** How long ago a driver was last used, for the picker chips. */
export function useSortedDrivers(drivers: DriverSummary[]) {
  return useMemo(
    () =>
      [...drivers].sort((a, b) => new Date(b.last_used || 0).getTime() - new Date(a.last_used || 0).getTime()),
    [drivers]
  )
}
