import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Loader2, Tag } from 'lucide-react'
import { estimateTrip, serviceIdFor } from '../lib/estimate'

/**
 * The running price a customer sees while filling in the booking form.
 *
 * It is an estimate, and it says so. The office still sends the binding quote,
 * and the wording here is careful not to promise otherwise — but a customer
 * who can see roughly what a trip costs before they submit is far likelier to
 * submit at all, which is the whole reason this is on the page.
 *
 * The figure is reported upward so it can be saved with the booking. The
 * office then knows what the website told this customer before it quotes them
 * something different.
 */
export function BookingEstimate({
  serviceType,
  vehicleName,
  pickup,
  dropoff,
  date,
  time,
  hours,
  onEstimate,
}: {
  serviceType: string
  vehicleName: string
  pickup: string
  dropoff: string
  date: string
  time?: string
  hours?: number
  /** The total shown, or null whenever there is nothing to show. */
  onEstimate: (total: number | null) => void
}) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'none'>('idle')
  const [total, setTotal] = useState<number | null>(null)
  const onEstimateRef = useRef(onEstimate)
  onEstimateRef.current = onEstimate

  const hourly = serviceIdFor(serviceType) === 'hourly'
  const ready = Boolean(pickup.trim() && (hourly || dropoff.trim()) && /^\d{4}-\d{2}-\d{2}$/.test(date))

  useEffect(() => {
    // Any change invalidates the figure on screen, and the one already saved.
    onEstimateRef.current(null)
    setTotal(null)
    if (!ready) {
      setState('idle')
      return
    }
    const controller = new AbortController()
    // Long enough that typing an address does not fire a lookup per keystroke.
    const timer = window.setTimeout(async () => {
      setState('loading')
      const result = await estimateTrip(
        { serviceType, vehicleName, pickup, dropoff, date, time, hours },
        controller.signal
      )
      if (controller.signal.aborted) return
      if (result && result.quotable && typeof result.total === 'number') {
        setTotal(result.total)
        setState('done')
        onEstimateRef.current(result.total)
      } else {
        setState('none')
      }
    }, 900)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [serviceType, vehicleName, pickup, dropoff, date, time, hours, ready])

  // Nothing to say yet, and nothing worth saying when a trip cannot be priced
  // automatically — the customer is about to submit and hear from us anyway.
  if (state === 'idle' || state === 'none') return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-[color:var(--gold)]/40 bg-[color:var(--gold)]/5 p-4"
      style={{ ['--gold' as string]: '#c9a227' }}
    >
      {state === 'loading' || total === null ? (
        <p className="flex items-center gap-2 text-sm text-white/60">
          <Loader2 className="h-4 w-4 animate-spin" /> Working out your estimate…
        </p>
      ) : (
        <>
          <div className="flex items-baseline justify-between gap-3">
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[color:var(--gold)]">
              <Tag className="h-3.5 w-3.5" /> Estimated price
            </p>
            <p className="font-display text-3xl text-[color:var(--gold)]">${total.toFixed(0)}</p>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-white/55">
            An estimate for this trip, including taxes and standard fees. Gratuity is not included. We confirm every
            reservation with a written quote before your trip begins.
          </p>
        </>
      )}
    </motion.div>
  )
}
