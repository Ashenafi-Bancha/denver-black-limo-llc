import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Building2, CalendarClock, CheckCircle2, Loader2, Mail, Pencil, Phone, Plus, Power, Trash2, X,
} from 'lucide-react'
import { ConfirmDialog, CopyButton, EmptyState, FilterChip, SearchInput, StatCard } from './AdminUI'

/**
 * Affiliates — the partner companies that run trips on our behalf.
 *
 * An affiliate is a business, not a person. We hand the whole job to
 * "ABC Transportation LLC" and they supply whichever chauffeur and vehicle they
 * like. That is why this list is deliberately separate from Drivers: a driver
 * is someone we dispatch and whose licence we hold, and the office has to be
 * able to tell at a glance which of the two is carrying a given trip.
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

export interface Affiliate {
  id: string
  companyName: string
  email: string
  phone: string | null
  contactName: string | null
  notes: string | null
  active: boolean
  trips: number
  completed: number
  upcoming: number
  lastTrip: string | null
  createdAt: string
}

const FIELD =
  'w-full rounded border border-white/10 bg-brand-black px-4 py-3 text-sm text-white outline-none transition-colors focus:border-brand-gold'
const LABEL = 'mb-2 block text-xs font-semibold uppercase tracking-widest text-brand-gold/80'

/** Add and edit share one form — the fields are identical either way. */
function AffiliateForm({
  affiliate,
  busy,
  error,
  onClose,
  onSave,
}: {
  affiliate: Affiliate | null
  busy: boolean
  error: string
  onClose: () => void
  onSave: (body: Record<string, unknown>) => void
}) {
  const [f, setF] = useState({
    companyName: affiliate?.companyName ?? '',
    email: affiliate?.email ?? '',
    phone: affiliate?.phone ?? '',
    contactName: affiliate?.contactName ?? '',
    notes: affiliate?.notes ?? '',
    active: affiliate?.active ?? true,
  })
  const set = (k: keyof typeof f, v: string | boolean) => setF((p) => ({ ...p, [k]: v }))
  const valid = f.companyName.trim().length > 1 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())

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
        className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-xl border border-white/10 bg-brand-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-white/10 bg-brand-black/90 p-5 backdrop-blur">
          <h2 className="flex items-center gap-2 font-display text-lg text-brand-gold">
            <Building2 className="h-5 w-5" /> {affiliate ? 'Edit affiliate' : 'Add an affiliate'}
          </h2>
          <button onClick={onClose} aria-label="Close" className="rounded p-1 text-white/40 transition-colors hover:bg-white/10 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 p-6">
          <div>
            <label className={LABEL}>Company name *</label>
            <input value={f.companyName} onChange={(e) => set('companyName', e.target.value)} className={FIELD} placeholder="ABC Transportation LLC" />
            <p className="mt-1.5 text-xs text-white/40">The partner company, not the chauffeur who drives for them.</p>
          </div>

          <div>
            <label className={LABEL}>Company email *</label>
            <input value={f.email} onChange={(e) => set('email', e.target.value)} className={FIELD} type="email" placeholder="dispatch@abctransport.com" />
            <p className="mt-1.5 text-xs text-white/40">Farmout sheets are sent here, and this is what identifies the affiliate.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={LABEL}>Phone</label>
              <input value={f.phone} onChange={(e) => set('phone', e.target.value)} className={FIELD} placeholder="(303) 555-0140" />
            </div>
            <div>
              <label className={LABEL}>Contact person</label>
              <input value={f.contactName} onChange={(e) => set('contactName', e.target.value)} className={FIELD} placeholder="Who answers the phone" />
            </div>
          </div>

          <div>
            <label className={LABEL}>Notes</label>
            <textarea value={f.notes} onChange={(e) => set('notes', e.target.value)} rows={3} className={`${FIELD} resize-none`} placeholder="Agreed rates, insurance on file, service area, anything dispatch should know." />
          </div>

          <label className="flex items-center gap-3 text-sm text-white/70">
            <input type="checkbox" checked={f.active} onChange={(e) => set('active', e.target.checked)} className="h-4 w-4 accent-brand-gold" />
            Active &mdash; can be given new trips
          </label>

          {error && <p className="text-sm font-medium text-red-400">{error}</p>}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button onClick={onClose} className="rounded border border-white/15 px-5 py-3 text-sm text-white/70 transition hover:text-white">
              Cancel
            </button>
            <button
              onClick={() => onSave({ ...f, companyName: f.companyName.trim(), email: f.email.trim() })}
              disabled={!valid || busy}
              className="inline-flex items-center justify-center gap-2 rounded bg-gold-gradient px-6 py-3 text-sm font-bold uppercase tracking-widest text-brand-black transition disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {affiliate ? 'Save changes' : 'Add affiliate'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

export function AdminAffiliates({
  token,
  onResult,
}: {
  token: string | null
  onResult: (text: string, kind: 'ok' | 'err') => void
}) {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'active' | 'inactive'>('active')
  const [editing, setEditing] = useState<Affiliate | null>(null)
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')
  const [pendingRemove, setPendingRemove] = useState<Affiliate | null>(null)
  const [removing, setRemoving] = useState(false)

  const headers = useMemo(
    () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }),
    [token]
  )

  const load = useCallback(async () => {
    try {
      // Inactive affiliates come back too, so the filter can show them without
      // a second trip to the server.
      const res = await fetch(`${API_URL}/affiliates?all=1`, { headers })
      if (res.ok) setAffiliates(await res.json())
      else onResult('Could not load the affiliates.', 'err')
    } catch {
      onResult('Could not reach the server.', 'err')
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
      const url = editing ? `${API_URL}/affiliates/${editing.id}` : `${API_URL}/affiliates`
      const res = await fetch(url, { method: editing ? 'PATCH' : 'POST', headers, body: JSON.stringify(body) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setFormError(data.error || 'Could not save this affiliate.')
        return
      }
      setEditing(null)
      setAdding(false)
      onResult(editing ? 'Affiliate updated.' : 'Affiliate added.', 'ok')
      load()
    } catch {
      setFormError('Could not reach the server.')
    } finally {
      setBusy(false)
    }
  }

  /** Activating and deactivating is the same edit, with one field flipped. */
  const toggleActive = async (a: Affiliate) => {
    try {
      const res = await fetch(`${API_URL}/affiliates/${a.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          companyName: a.companyName,
          email: a.email,
          phone: a.phone,
          contactName: a.contactName,
          notes: a.notes,
          active: !a.active,
        }),
      })
      if (!res.ok) throw new Error()
      onResult(`${a.companyName} ${a.active ? 'deactivated' : 'reactivated'}.`, 'ok')
      load()
    } catch {
      onResult('Could not change that affiliate.', 'err')
    }
  }

  const confirmRemove = async () => {
    const a = pendingRemove
    if (!a) return
    setRemoving(true)
    try {
      const res = await fetch(`${API_URL}/affiliates/${a.id}`, { method: 'DELETE', headers })
      if (!res.ok) throw new Error()
      const data = await res.json().catch(() => ({}))
      onResult(data.retired ? `${a.companyName} retired.` : `${a.companyName} removed.`, 'ok')
      setPendingRemove(null)
      load()
    } catch {
      onResult('Could not remove this affiliate.', 'err')
    } finally {
      setRemoving(false)
    }
  }

  const activeCount = affiliates.filter((a) => a.active).length
  const withWork = affiliates.filter((a) => a.trips > 0).length
  const upcoming = affiliates.reduce((sum, a) => sum + a.upcoming, 0)

  const shown = affiliates
    .filter((a) => (filter === 'active' ? a.active : !a.active))
    .filter((a) =>
      query.trim()
        ? [a.companyName, a.email, a.phone, a.contactName].join(' ').toLowerCase().includes(query.trim().toLowerCase())
        : true
    )

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl text-brand-gold sm:text-3xl">Affiliates</h1>
          <p className="mt-1 text-sm text-white/50">
            Partner companies that run trips on your behalf. Not chauffeurs &mdash; the affiliate
            supplies their own.
          </p>
        </div>
        <button
          onClick={() => {
            setFormError('')
            setAdding(true)
          }}
          className="inline-flex items-center gap-2 rounded bg-gold-gradient px-5 py-2.5 text-sm font-bold uppercase tracking-widest text-brand-black transition hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> Add affiliate
        </button>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Active affiliates" value={String(activeCount)} icon={<Building2 className="h-5 w-5" />} />
        <StatCard label="Have run trips for you" value={String(withWork)} icon={<CheckCircle2 className="h-5 w-5" />} />
        <StatCard label="Trips coming up" value={String(upcoming)} icon={<CalendarClock className="h-5 w-5" />} tone={upcoming ? 'gold' : undefined} />
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <SearchInput value={query} onChange={setQuery} placeholder="Search company, email, phone or contact" />
        <FilterChip active={filter === 'active'} onClick={() => setFilter('active')} label="Active" count={activeCount} />
        <FilterChip active={filter === 'inactive'} onClick={() => setFilter('inactive')} label="Inactive" count={affiliates.length - activeCount} />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-brand-gold" />
        </div>
      ) : !shown.length ? (
        <EmptyState
          icon={<Building2 className="h-8 w-8" />}
          text={affiliates.length ? 'No affiliates match that.' : 'No affiliates yet.'}
          hint={
            affiliates.length
              ? undefined
              : 'Add the partner companies you farm trips out to, and they will appear when you assign a reservation.'
          }
        />
      ) : (
        <div className="space-y-3">
          {shown.map((a) => (
            <div
              key={a.id}
              className={`rounded-lg border bg-brand-surface p-4 transition-colors ${
                a.active ? 'border-white/10 hover:border-white/20' : 'border-white/5 opacity-70'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium text-white">{a.companyName}</h3>
                    {!a.active && (
                      <span className="rounded border border-white/20 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white/40">
                        Inactive
                      </span>
                    )}
                    {a.upcoming > 0 && (
                      <span className="inline-flex items-center gap-1 rounded border border-brand-gold/40 bg-brand-gold/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-gold-light">
                        <CalendarClock className="h-3 w-3" /> {a.upcoming} coming up
                      </span>
                    )}
                  </div>

                  <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-white/50">
                    <Mail className="h-3.5 w-3.5 shrink-0 text-brand-gold/50" />
                    <a href={`mailto:${a.email}`} className="truncate hover:text-brand-gold">{a.email}</a>
                    <CopyButton value={a.email} label="Copy email" />
                    {a.phone && (
                      <>
                        <Phone className="ml-1 h-3.5 w-3.5 shrink-0 text-brand-gold/50" />
                        <a href={`tel:${a.phone}`} className="hover:text-brand-gold">{a.phone}</a>
                      </>
                    )}
                  </p>

                  {a.contactName && <p className="mt-0.5 text-xs text-white/40">Contact: {a.contactName}</p>}

                  <p className="mt-2 text-xs text-white/40">
                    {a.trips} trip{a.trips === 1 ? '' : 's'}
                    {a.completed ? ` · ${a.completed} completed` : ''}
                    {a.lastTrip ? ` · last ${a.lastTrip}` : ''}
                  </p>

                  {a.notes && <p className="mt-2 whitespace-pre-wrap text-xs text-white/45">{a.notes}</p>}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => toggleActive(a)}
                    title={a.active ? 'Deactivate — keeps their trips, stops new assignments' : 'Reactivate'}
                    className={`rounded border p-2 transition ${
                      a.active
                        ? 'border-white/10 text-white/50 hover:border-amber-500/40 hover:text-amber-400'
                        : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                    }`}
                  >
                    <Power className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      setFormError('')
                      setEditing(a)
                    }}
                    title="Edit this affiliate"
                    className="rounded border border-white/10 p-2 text-white/50 transition hover:border-brand-gold/40 hover:text-brand-gold"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setPendingRemove(a)}
                    title={a.trips > 0 ? 'Retire this affiliate' : 'Delete this affiliate'}
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
        title={pendingRemove && pendingRemove.trips > 0 ? `Retire ${pendingRemove.companyName}?` : `Remove ${pendingRemove?.companyName}?`}
        message={
          pendingRemove && pendingRemove.trips > 0 ? (
            <>
              <span className="font-semibold text-white">{pendingRemove.companyName}</span> has run{' '}
              {pendingRemove.trips} trip{pendingRemove.trips === 1 ? '' : 's'}, so the record is kept and
              those reservations still show them. They will no longer appear when you assign a trip.
            </>
          ) : (
            <>
              <span className="font-semibold text-white">{pendingRemove?.companyName}</span> has never been
              assigned a trip, so this record will be deleted outright.
            </>
          )
        }
        confirmLabel={pendingRemove && pendingRemove.trips > 0 ? 'Retire affiliate' : 'Delete affiliate'}
        onConfirm={confirmRemove}
        onCancel={() => setPendingRemove(null)}
      />

      {(adding || editing) && (
        <AffiliateForm
          affiliate={editing}
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
