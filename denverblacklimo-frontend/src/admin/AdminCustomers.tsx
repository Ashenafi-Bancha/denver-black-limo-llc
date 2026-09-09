import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Building2, CalendarClock, CreditCard, Loader2, Phone, Repeat, TrendingDown, Users,
} from 'lucide-react'
import { CopyButton, EmptyState, FilterChip, SearchInput, StatCard } from './AdminUI'

/**
 * Who books, how often, and who is worth chasing.
 *
 * There is no customers table. A customer is the set of trips booked from one
 * email address, worked out from the bookings themselves, so this list can
 * never disagree with the bookings it came from and there is nothing to keep
 * in sync. Someone who calls without giving an email still counts on their own
 * booking; they simply cannot be grouped, and are left out rather than merged
 * into a fictional "unknown customer".
 *
 * Money is deliberately absent. Nothing has been paid through the site yet, so
 * lifetime value has no source — and a zero would read as "spent nothing"
 * rather than "we do not know".
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

export interface Customer {
  name: string | null
  email: string | null
  phone: string | null
  company: string | null
  trips: number
  completed: number
  cancelled: number
  open: number
  byPhone: number
  firstSeen: string | null
  lastSeen: string | null
  lastTrip: string | null
  nextTrip: string | null
  topService: string | null
  topVehicle: string | null
  repeat: boolean
  cancelRate: number
  totalPaid: number | null
  payments: unknown | null
}

export function AdminCustomers({
  token,
  onResult,
}: {
  token: string | null
  onResult: (text: string, kind: 'ok' | 'err') => void
}) {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'repeat' | 'upcoming'>('all')

  const headers = useMemo(
    () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }),
    [token]
  )

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/customers`, { headers })
      if (res.ok) setCustomers(await res.json())
    } catch {
      onResult('Could not load the customers.', 'err')
    } finally {
      setLoading(false)
    }
  }, [headers, onResult])

  useEffect(() => {
    load()
  }, [load])

  const repeats = customers.filter((c) => c.repeat).length
  const phoneOnly = customers.filter((c) => c.byPhone === c.trips && c.trips > 0).length

  const shown = customers
    .filter((c) => (filter === 'repeat' ? c.repeat : true))
    .filter((c) => (filter === 'upcoming' ? Boolean(c.nextTrip) : true))
    .filter((c) =>
      query.trim()
        ? [c.name, c.email, c.phone, c.company].join(' ').toLowerCase().includes(query.trim().toLowerCase())
        : true
    )

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl text-brand-gold sm:text-3xl">Customers</h1>
        <p className="mt-1 text-sm text-white/50">
          Everyone who has booked, grouped by email address.
        </p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Customers" value={String(customers.length)} icon={<Users className="h-5 w-5" />} />
        <StatCard
          label="Booked more than once"
          value={String(repeats)}
          hint={customers.length ? `${Math.round((repeats / customers.length) * 100)}% of customers` : undefined}
          icon={<Repeat className="h-5 w-5" />}
          tone={repeats ? 'gold' : undefined}
        />
        <StatCard label="Only ever booked by phone" value={String(phoneOnly)} icon={<Phone className="h-5 w-5" />} />
        <StatCard label="Lifetime value" value="—" hint="Needs a payment provider" icon={<CreditCard className="h-5 w-5" />} />
      </div>

      {/* Said once, plainly, rather than leaving a dash on every row for the
          office to puzzle over. */}
      <div className="mb-6 flex items-start gap-2.5 rounded-lg border border-white/10 bg-brand-surface p-4">
        <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-white/40" />
        <p className="text-xs leading-relaxed text-white/50">
          <b className="text-white/70">Payment history is not here yet.</b> Nothing has been paid through the
          site, so there is no total to show. Once Square is connected, what each customer has paid and when
          appears on these rows automatically — the trips below are already the record it will attach to.
        </p>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <SearchInput value={query} onChange={setQuery} placeholder="Search name, email, phone or company" />
        <FilterChip active={filter === 'all'} onClick={() => setFilter('all')} label="All" count={customers.length} />
        <FilterChip active={filter === 'repeat'} onClick={() => setFilter('repeat')} label="Repeat" count={repeats} />
        <FilterChip
          active={filter === 'upcoming'}
          onClick={() => setFilter('upcoming')}
          label="Trip booked"
          count={customers.filter((c) => c.nextTrip).length}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-brand-gold" />
        </div>
      ) : !shown.length ? (
        <EmptyState
          icon={<Users className="h-8 w-8" />}
          text={customers.length ? 'No customers match that.' : 'No customers yet.'}
          hint={customers.length ? undefined : 'Everyone who books through the site or by phone appears here.'}
        />
      ) : (
        <div className="space-y-3">
          {shown.map((c) => (
            <div
              key={c.email || c.name || Math.random()}
              className="rounded-lg border border-white/10 bg-brand-surface p-4 transition-colors hover:border-white/20"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium text-white">{c.name || c.email}</h3>
                    {c.repeat && (
                      <span className="inline-flex items-center gap-1 rounded border border-brand-gold/40 bg-brand-gold/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-gold-light">
                        <Repeat className="h-3 w-3" /> {c.trips} trips
                      </span>
                    )}
                    {/* Worth seeing before a car is held for them again. */}
                    {c.cancelRate >= 50 && c.trips > 1 && (
                      <span className="inline-flex items-center gap-1 rounded border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-300">
                        <TrendingDown className="h-3 w-3" /> cancels {c.cancelRate}%
                      </span>
                    )}
                  </div>

                  <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-white/50">
                    <span className="truncate">{c.email}</span>
                    {c.email && <CopyButton value={c.email} label="Copy email" />}
                    {c.phone && <span className="text-white/30">·</span>}
                    {c.phone && <span>{c.phone}</span>}
                  </p>

                  {c.company && (
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-white/40">
                      <Building2 className="h-3 w-3" /> {c.company}
                    </p>
                  )}

                  <p className="mt-2 text-xs text-white/40">
                    {c.trips} booking{c.trips === 1 ? '' : 's'}
                    {c.completed ? ` · ${c.completed} completed` : ''}
                    {c.cancelled ? ` · ${c.cancelled} cancelled` : ''}
                    {c.byPhone ? ` · ${c.byPhone} by phone` : ''}
                    {c.topService ? ` · usually ${c.topService}` : ''}
                    {c.topVehicle ? ` · ${c.topVehicle}` : ''}
                  </p>
                </div>

                <div className="shrink-0 text-right text-xs">
                  {c.nextTrip ? (
                    <p className="flex items-center justify-end gap-1.5 font-medium text-brand-gold-light">
                      <CalendarClock className="h-3.5 w-3.5" /> next {c.nextTrip}
                    </p>
                  ) : (
                    <p className="text-white/30">no trip booked</p>
                  )}
                  {c.lastTrip && <p className="mt-1 text-white/40">last trip {c.lastTrip}</p>}
                  {c.firstSeen && <p className="mt-1 text-white/30">customer since {c.firstSeen}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
