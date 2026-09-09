import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  AlertTriangle, BadgeCheck, Car, Loader2, MapPin, Pencil, Plus, ShieldAlert, Trash2, UserRound, X,
} from 'lucide-react'
import { ConfirmDialog, EmptyState, FilterChip, SearchInput, StatCard } from './AdminUI'

/**
 * The people who actually drive the cars.
 *
 * A limo operator's real exposure is not a missed booking, it is putting a car
 * on the road behind a driver whose licence, insurance or medical card has
 * quietly lapsed. So this list leads with paperwork: what is expired, what is
 * about to be, and what was never recorded at all. Everything else — trips
 * run, vehicle, contact — is supporting detail.
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

export interface DriverDoc {
  status: 'ok' | 'expiring' | 'expired' | 'missing'
  days: number | null
  expires: string | null
  number?: string | null
  policy?: string | null
}

export interface Driver {
  id: string
  name: string
  email: string
  phone: string | null
  vehicle: string | null
  vehiclePlate: string | null
  defaultPay: string | null
  notes: string | null
  active: boolean
  trips: number
  completed: number
  lastTrip: string | null
  docs: { license: DriverDoc; insurance: DriverDoc; medical: DriverDoc }
  compliance: 'ok' | 'expiring' | 'expired' | 'missing'
  position: { lat: number; lng: number; at: string } | null
}

const FIELD =
  'w-full rounded border border-white/10 bg-brand-black px-4 py-3 text-sm text-white outline-none transition-colors focus:border-brand-gold'
const LABEL = 'mb-2 block text-xs font-semibold uppercase tracking-widest text-brand-gold/80'

const DOC_LABEL: Record<string, string> = {
  license: "Driver's licence",
  insurance: 'Insurance',
  medical: 'Medical card',
}

const TONE: Record<string, string> = {
  ok: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  expiring: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  expired: 'border-red-500/40 bg-red-500/10 text-red-300',
  missing: 'border-white/20 bg-white/5 text-white/50',
}

/** Plain English for a document's state, which is what the office reads. */
function docText(doc: DriverDoc): string {
  if (doc.status === 'missing') return 'not recorded'
  if (doc.status === 'expired') return `expired ${Math.abs(doc.days ?? 0)}d ago`
  if (doc.status === 'expiring') return `${doc.days}d left`
  return `to ${doc.expires}`
}

function DocPill({ kind, doc }: { kind: string; doc: DriverDoc }) {
  return (
    <span
      title={`${DOC_LABEL[kind]}${doc.expires ? ` expires ${doc.expires}` : ' has not been recorded'}`}
      className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] ${TONE[doc.status]}`}
    >
      {doc.status === 'expired' && <AlertTriangle className="h-3 w-3" />}
      <span className="font-medium">{DOC_LABEL[kind]}</span>
      <span className="opacity-75">{docText(doc)}</span>
    </span>
  )
}

/** Add and edit share one form — the fields are identical either way. */
function DriverForm({
  driver,
  busy,
  error,
  onClose,
  onSave,
}: {
  driver: Driver | null
  busy: boolean
  error: string
  onClose: () => void
  onSave: (body: Record<string, unknown>) => void
}) {
  const [f, setF] = useState({
    name: driver?.name ?? '',
    email: driver?.email ?? '',
    phone: driver?.phone ?? '',
    vehicle: driver?.vehicle ?? '',
    vehiclePlate: driver?.vehiclePlate ?? '',
    licenseNumber: driver?.docs.license.number ?? '',
    licenseExpires: driver?.docs.license.expires ?? '',
    insurancePolicy: driver?.docs.insurance.policy ?? '',
    insuranceExpires: driver?.docs.insurance.expires ?? '',
    medicalExpires: driver?.docs.medical.expires ?? '',
    defaultPay: driver?.defaultPay ?? '',
    notes: driver?.notes ?? '',
    active: driver?.active ?? true,
  })
  const set = (k: keyof typeof f, v: string | boolean) => setF((p) => ({ ...p, [k]: v }))
  const valid = f.name.trim().length > 1 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())

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
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-white/10 bg-brand-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-white/10 bg-brand-black/90 p-5 backdrop-blur">
          <h2 className="flex items-center gap-2 font-display text-lg text-brand-gold">
            <UserRound className="h-5 w-5" /> {driver ? 'Edit driver' : 'Add a driver'}
          </h2>
          <button onClick={onClose} aria-label="Close" className="rounded p-1 text-white/40 transition-colors hover:bg-white/10 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={LABEL}>Full name *</label>
              <input value={f.name} onChange={(e) => set('name', e.target.value)} className={FIELD} placeholder="Marcus Bell" />
            </div>
            <div>
              <label className={LABEL}>Phone</label>
              <input value={f.phone} onChange={(e) => set('phone', e.target.value)} className={FIELD} placeholder="(720) 555-0110" />
            </div>
          </div>

          <div>
            <label className={LABEL}>Email *</label>
            <input value={f.email} onChange={(e) => set('email', e.target.value)} className={FIELD} type="email" placeholder="driver@example.com" />
            <p className="mt-1.5 text-xs text-white/40">Trip sheets are sent here, and this is what identifies the driver.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={LABEL}>Vehicle</label>
              <input value={f.vehicle} onChange={(e) => set('vehicle', e.target.value)} className={FIELD} placeholder="Cadillac Escalade ESV" />
            </div>
            <div>
              <label className={LABEL}>Plate</label>
              <input value={f.vehiclePlate} onChange={(e) => set('vehiclePlate', e.target.value)} className={FIELD} placeholder="CO-2214" />
            </div>
          </div>

          {/* The compliance block, kept together so nothing here gets skipped
              on the way past to the pay field. */}
          <div className="rounded-lg border border-white/10 bg-brand-black/40 p-4">
            <p className="mb-4 flex items-center gap-2 text-sm font-semibold text-brand-gold-light">
              <ShieldAlert className="h-4 w-4" /> Licence and insurance
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={LABEL}>Licence number</label>
                <input value={f.licenseNumber} onChange={(e) => set('licenseNumber', e.target.value)} className={FIELD} placeholder="DL-99182" />
              </div>
              <div>
                <label className={LABEL}>Licence expires</label>
                <input value={f.licenseExpires} onChange={(e) => set('licenseExpires', e.target.value)} className={FIELD} type="date" />
              </div>
              <div>
                <label className={LABEL}>Insurance policy</label>
                <input value={f.insurancePolicy} onChange={(e) => set('insurancePolicy', e.target.value)} className={FIELD} placeholder="POL-77431" />
              </div>
              <div>
                <label className={LABEL}>Insurance expires</label>
                <input value={f.insuranceExpires} onChange={(e) => set('insuranceExpires', e.target.value)} className={FIELD} type="date" />
              </div>
              <div>
                <label className={LABEL}>Medical card expires</label>
                <input value={f.medicalExpires} onChange={(e) => set('medicalExpires', e.target.value)} className={FIELD} type="date" />
                <p className="mt-1.5 text-xs text-white/40">Required for commercial passenger work.</p>
              </div>
              <div>
                <label className={LABEL}>Usual pay</label>
                <input value={f.defaultPay} onChange={(e) => set('defaultPay', e.target.value)} className={FIELD} placeholder="$120 flat, or 70%" />
              </div>
            </div>
          </div>

          <div>
            <label className={LABEL}>Notes</label>
            <textarea value={f.notes} onChange={(e) => set('notes', e.target.value)} rows={2} className={`${FIELD} resize-none`} placeholder="Languages, preferred work, anything dispatch should know." />
          </div>

          <label className="flex items-center gap-3 text-sm text-white/70">
            <input type="checkbox" checked={f.active} onChange={(e) => set('active', e.target.checked)} className="h-4 w-4 accent-brand-gold" />
            Available for dispatch
          </label>

          {error && <p className="text-sm font-medium text-red-400">{error}</p>}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button onClick={onClose} className="rounded border border-white/15 px-5 py-3 text-sm text-white/70 transition hover:text-white">
              Cancel
            </button>
            <button
              onClick={() => onSave({ ...f, name: f.name.trim(), email: f.email.trim() })}
              disabled={!valid || busy}
              className="inline-flex items-center justify-center gap-2 rounded bg-gold-gradient px-6 py-3 text-sm font-bold uppercase tracking-widest text-brand-black transition disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {driver ? 'Save changes' : 'Add driver'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

export function AdminDrivers({
  token,
  onResult,
}: {
  token: string | null
  onResult: (text: string, kind: 'ok' | 'err') => void
}) {
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'attention' | 'retired'>('all')
  const [editing, setEditing] = useState<Driver | null>(null)
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')
  const [pendingRemove, setPendingRemove] = useState<Driver | null>(null)
  const [removing, setRemoving] = useState(false)

  const headers = useMemo(
    () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }),
    [token]
  )

  const load = useCallback(async () => {
    try {
      // Retired drivers are fetched too, so the filter can show them without a
      // second trip to the server.
      const res = await fetch(`${API_URL}/drivers?all=1`, { headers })
      if (res.ok) setDrivers(await res.json())
    } catch {
      onResult('Could not load the drivers.', 'err')
    } finally {
      setLoading(false)
    }
  }, [headers, onResult])

  useEffect(() => {
    load()
  }, [load])

  const save = async (body: Record<string, unknown>) => {
    setBusy(true)
    setFormError('')
    try {
      const url = editing ? `${API_URL}/drivers/${editing.id}` : `${API_URL}/drivers`
      const res = await fetch(url, { method: editing ? 'PATCH' : 'POST', headers, body: JSON.stringify(body) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setFormError(data.error || 'Could not save this driver.')
        return
      }
      setEditing(null)
      setAdding(false)
      onResult(editing ? 'Driver updated.' : 'Driver added.', 'ok')
      load()
    } catch {
      setFormError('Could not reach the server.')
    } finally {
      setBusy(false)
    }
  }

  const confirmRemove = async () => {
    const d = pendingRemove
    if (!d) return
    setRemoving(true)
    try {
      const res = await fetch(`${API_URL}/drivers/${d.id}`, { method: 'DELETE', headers })
      if (!res.ok) throw new Error()
      onResult(d.trips > 0 ? `${d.name} retired.` : `${d.name} removed.`, 'ok')
      setPendingRemove(null)
      load()
    } catch {
      onResult('Could not remove this driver.', 'err')
    } finally {
      setRemoving(false)
    }
  }

  const expired = drivers.filter((d) => d.active && d.compliance === 'expired').length
  const expiring = drivers.filter((d) => d.active && d.compliance === 'expiring').length
  const activeCount = drivers.filter((d) => d.active).length

  const shown = drivers
    .filter((d) => (filter === 'retired' ? !d.active : d.active))
    .filter((d) => (filter === 'attention' ? d.compliance === 'expired' || d.compliance === 'expiring' : true))
    .filter((d) =>
      query.trim()
        ? [d.name, d.email, d.phone, d.vehicle].join(' ').toLowerCase().includes(query.trim().toLowerCase())
        : true
    )

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl text-brand-gold sm:text-3xl">Drivers</h1>
          <p className="mt-1 text-sm text-white/50">
            Who can drive, what they drive, and whose paperwork needs renewing.
          </p>
        </div>
        <button
          onClick={() => {
            setFormError('')
            setAdding(true)
          }}
          className="inline-flex items-center gap-2 rounded bg-gold-gradient px-5 py-2.5 text-sm font-bold uppercase tracking-widest text-brand-black transition hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> Add driver
        </button>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Available for dispatch" value={String(activeCount)} icon={<Car className="h-5 w-5" />} />
        <StatCard label="Paperwork expiring" value={String(expiring)} icon={<AlertTriangle className="h-5 w-5" />} tone={expiring ? 'gold' : undefined} />
        <StatCard label="Cannot drive today" value={String(expired)} icon={<ShieldAlert className="h-5 w-5" />} tone={expired ? 'alert' : undefined} />
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <SearchInput value={query} onChange={setQuery} placeholder="Search name, email, phone or vehicle" />
        <FilterChip active={filter === 'all'} onClick={() => setFilter('all')} label="All" count={activeCount} />
        <FilterChip active={filter === 'attention'} onClick={() => setFilter('attention')} label="Needs attention" count={expired + expiring} />
        <FilterChip active={filter === 'retired'} onClick={() => setFilter('retired')} label="Retired" count={drivers.length - activeCount} />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-brand-gold" />
        </div>
      ) : !shown.length ? (
        <EmptyState
          icon={<UserRound className="h-8 w-8" />}
          text={drivers.length ? 'No drivers match that.' : 'No drivers yet.'}
          hint={drivers.length ? undefined : 'Add the chauffeurs you work with and they will appear when you assign a trip.'}
        />
      ) : (
        <div className="space-y-3">
          {shown.map((d) => (
            <div
              key={d.id}
              className={`rounded-lg border bg-brand-surface p-4 transition-colors ${
                d.compliance === 'expired' ? 'border-red-500/30' : 'border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium text-white">{d.name}</h3>
                    {d.compliance === 'ok' && <BadgeCheck className="h-4 w-4 text-emerald-400" />}
                    {!d.active && (
                      <span className="rounded border border-white/20 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white/40">
                        Retired
                      </span>
                    )}
                  </div>
                  <p className="mt-1 truncate text-sm text-white/50">
                    {d.email}
                    {d.phone ? ` · ${d.phone}` : ''}
                  </p>
                  <p className="mt-0.5 text-xs text-white/40">
                    {d.vehicle || 'No vehicle recorded'}
                    {d.vehiclePlate ? ` · ${d.vehiclePlate}` : ''} · {d.trips} trip{d.trips === 1 ? '' : 's'}
                    {d.completed ? `, ${d.completed} completed` : ''}
                    {d.lastTrip ? ` · last ${d.lastTrip}` : ''}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <DocPill kind="license" doc={d.docs.license} />
                    <DocPill kind="insurance" doc={d.docs.insurance} />
                    <DocPill kind="medical" doc={d.docs.medical} />
                  </div>

                  {/* Filled by the driver app once it exists. Saying so beats a
                      blank space the office has to interpret. */}
                  <p className="mt-2.5 flex items-center gap-1.5 text-xs text-white/30">
                    <MapPin className="h-3 w-3" />
                    {d.position
                      ? `Last seen ${d.position.lat.toFixed(4)}, ${d.position.lng.toFixed(4)}`
                      : 'Live location available once the driver app is installed'}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => {
                      setFormError('')
                      setEditing(d)
                    }}
                    title="Edit this driver"
                    className="rounded border border-white/10 p-2 text-white/50 transition hover:border-brand-gold/40 hover:text-brand-gold"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setPendingRemove(d)}
                    title={d.trips > 0 ? 'Retire this driver' : 'Delete this driver'}
                    className="rounded border border-white/10 p-2 text-white/40 transition hover:border-red-500/40 hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pendingRemove)}
        busy={removing}
        title={pendingRemove && pendingRemove.trips > 0 ? `Retire ${pendingRemove.name}?` : `Remove ${pendingRemove?.name}?`}
        message={
          pendingRemove && pendingRemove.trips > 0 ? (
            <>
              <span className="font-semibold text-white">{pendingRemove.name}</span> has run{' '}
              {pendingRemove.trips} trip{pendingRemove.trips === 1 ? '' : 's'}, so the record is kept and they
              stay on those bookings. They will no longer appear when you assign a driver.
            </>
          ) : (
            <>
              <span className="font-semibold text-white">{pendingRemove?.name}</span> has never been assigned a
              trip, so this record will be deleted outright.
            </>
          )
        }
        confirmLabel={pendingRemove && pendingRemove.trips > 0 ? 'Retire driver' : 'Delete driver'}
        onConfirm={confirmRemove}
        onCancel={() => setPendingRemove(null)}
      />

      {(adding || editing) && (
        <DriverForm
          driver={editing}
          busy={busy}
          error={formError}
          onClose={() => {
            setAdding(false)
            setEditing(null)
          }}
          onSave={save}
        />
      )}
    </div>
  )
}
