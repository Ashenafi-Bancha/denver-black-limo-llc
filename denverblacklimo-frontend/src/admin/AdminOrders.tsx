import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { CalendarDays, Globe, Phone, Repeat, TrendingDown, TrendingUp } from 'lucide-react'

/**
 * Order counts for market analysis.
 *
 * The dashboard lists only the most recent hundred bookings, so every number
 * here comes from the server, which counts the whole table. That distinction
 * matters: counting the visible page would quietly understate the business the
 * moment it passes a hundred trips.
 *
 * Chart animation is off throughout. Recharts draws its geometry from a
 * requestAnimationFrame loop, so anywhere that loop is throttled — an embedded
 * webview, a screenshot, a background tab — an animated chart paints its axes
 * and nothing else. A dashboard is read, not watched; drawing immediately is
 * worth more than the entrance.
 */

export interface OrderAnalytics {
  totals: {
    allTime: number
    today: number
    thisWeek: number
    thisMonth: number
    lastMonth: number
    thisYear: number
    upcoming: number
    monthChangePct: number | null
  }
  monthly: { month: string; label: string; count: number; offline: number }[]
  byService: { name: string; count: number }[]
  bySource: { name: string; count: number }[]
  byStatus: { name: string; count: number }[]
  byVehicle: { name: string; count: number }[]
  byWeekday: { name: string; count: number }[]
  repeat: { customers: number; orders: number }
  avgLeadDays: number | null
  generatedAt: string
}

const GOLD = '#c9a227'
const GOLD_LIGHT = '#d4af37'
/** Website against everything the office entered by hand. */
const SOURCE_COLORS = ['#c9a227', '#4f9d69', '#5b8def', '#c2554d', '#8b5cf6', '#6b7280']

const Panel = ({ title, icon, children, className = '' }: { title: string; icon?: React.ReactNode; children: React.ReactNode; className?: string }) => (
  <div className={`rounded-xl border border-white/10 bg-brand-surface p-6 shadow-2xl shadow-black/20 ${className}`}>
    <h2 className="mb-5 flex items-center gap-2 text-lg font-bold text-white">
      {icon}
      {title}
    </h2>
    {children}
  </div>
)

const tooltipStyle = {
  contentStyle: { backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px' },
  itemStyle: { color: '#fff' },
  labelStyle: { color: '#9ca3af' },
}

/** A headline number with the comparison that gives it meaning. */
function OrderStat({
  label,
  value,
  sub,
  icon,
  change,
}: {
  label: string
  value: number | string
  sub?: string
  icon: React.ReactNode
  change?: number | null
}) {
  const up = typeof change === 'number' && change > 0
  const down = typeof change === 'number' && change < 0
  return (
    <div className="rounded-xl border border-white/10 bg-brand-surface p-5">
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/50">{label}</p>
        <span className="text-brand-gold/70">{icon}</span>
      </div>
      <p className="mt-3 font-display text-4xl text-brand-gold">{value}</p>
      <div className="mt-1.5 flex items-center gap-2">
        {typeof change === 'number' && (
          <span className={`inline-flex items-center gap-1 text-xs font-semibold ${up ? 'text-emerald-400' : down ? 'text-red-400' : 'text-white/50'}`}>
            {up ? <TrendingUp className="h-3.5 w-3.5" /> : down ? <TrendingDown className="h-3.5 w-3.5" /> : null}
            {up ? '+' : ''}{change}%
          </span>
        )}
        {sub && <span className="text-xs text-white/45">{sub}</span>}
      </div>
    </div>
  )
}

export function OrderAnalyticsPanel({ data }: { data: OrderAnalytics }) {
  const { totals } = data
  const busiestMonth = data.monthly.reduce((a, b) => (b.count > a.count ? b : a), data.monthly[0] || { label: '—', count: 0 })
  const busiestDay = data.byWeekday.reduce((a, b) => (b.count > a.count ? b : a), data.byWeekday[0] || { name: '—', count: 0 })
  const website = data.bySource.find((s) => s.name === 'Website')?.count ?? 0
  const offline = totals.allTime - website
  const offlineShare = totals.allTime ? Math.round((offline / totals.allTime) * 100) : 0

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <OrderStat
          label="Orders this month"
          value={totals.thisMonth}
          icon={<CalendarDays className="h-5 w-5" />}
          change={totals.monthChangePct}
          sub={totals.lastMonth ? `vs ${totals.lastMonth} last month` : 'no month to compare yet'}
        />
        <OrderStat label="Orders all time" value={totals.allTime} icon={<TrendingUp className="h-5 w-5" />} sub={`${totals.thisYear} this year`} />
        <OrderStat label="Taken by phone" value={offline} icon={<Phone className="h-5 w-5" />} sub={`${offlineShare}% of all orders`} />
        <OrderStat
          label="Repeat customers"
          value={data.repeat.customers}
          icon={<Repeat className="h-5 w-5" />}
          sub={data.repeat.orders ? `${data.repeat.orders} of their orders` : 'no repeats yet'}
        />
      </div>

      <Panel title="Orders per month" icon={<TrendingUp className="h-5 w-5 text-brand-gold" />}>
        <p className="-mt-3 mb-5 text-sm text-white/50">
          The last twelve months, with the share taken by phone shaded underneath.
          {busiestMonth.count > 0 && <> Busiest so far: <span className="text-brand-gold-light">{busiestMonth.label}</span>.</>}
        </p>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.monthly} margin={{ top: 5, right: 10, left: -22, bottom: 0 }}>
              <defs>
                <linearGradient id="ordersFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={GOLD} stopOpacity={0.55} />
                  <stop offset="100%" stopColor={GOLD} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff14" vertical={false} />
              <XAxis dataKey="label" stroke="#ffffff66" tick={{ fill: '#ffffff88', fontSize: 12 }} tickLine={false} />
              <YAxis stroke="#ffffff66" tick={{ fill: '#ffffff66', fontSize: 12 }} allowDecimals={false} />
              <RechartsTooltip {...tooltipStyle} />
              <Area type="monotone" dataKey="count" name="Orders" stroke={GOLD_LIGHT} strokeWidth={2} fill="url(#ordersFill)" isAnimationActive={false} />
              <Area type="monotone" dataKey="offline" name="By phone" stroke="#4f9d69" strokeWidth={1.5} fill="#4f9d6926" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Where orders come from" icon={<Globe className="h-5 w-5 text-brand-gold" />}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.bySource} cx="50%" cy="50%" innerRadius={62} outerRadius={98} paddingAngle={2} dataKey="count" nameKey="name" isAnimationActive={false}
                     label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                  {data.bySource.map((_, i) => <Cell key={i} fill={SOURCE_COLORS[i % SOURCE_COLORS.length]} />)}
                </Pie>
                <RechartsTooltip {...tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-center text-xs text-white/45">
            Phone and walk-in orders are entered by the office; everything else arrives through the website.
          </p>
        </Panel>

        <Panel title="Busiest pick-up days" icon={<CalendarDays className="h-5 w-5 text-brand-gold" />}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.byWeekday} margin={{ top: 5, right: 10, left: -22, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff14" vertical={false} />
                <XAxis dataKey="name" stroke="#ffffff66" tick={{ fill: '#ffffff88', fontSize: 12 }} tickLine={false} />
                <YAxis stroke="#ffffff66" tick={{ fill: '#ffffff66', fontSize: 12 }} allowDecimals={false} />
                <RechartsTooltip cursor={{ fill: '#ffffff0d' }} {...tooltipStyle} />
                <Bar dataKey="count" name="Trips" fill={GOLD} radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-center text-xs text-white/45">
            {busiestDay.count > 0
              ? `${busiestDay.name} is the busiest day to staff for.`
              : 'Fills in as trips are booked.'}
          </p>
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Most requested vehicles" icon={<TrendingUp className="h-5 w-5 text-brand-gold" />}>
          {data.byVehicle.length === 0 ? (
            <p className="text-sm text-white/50">No vehicle preferences recorded yet.</p>
          ) : (
            <ul className="space-y-3">
              {data.byVehicle.map((v) => {
                const pct = totals.allTime ? Math.round((v.count / totals.allTime) * 100) : 0
                return (
                  <li key={v.name}>
                    <div className="mb-1 flex items-baseline justify-between text-sm">
                      <span className="text-white/80">{v.name}</span>
                      <span className="text-white/50">{v.count} &middot; {pct}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-gold-gradient" style={{ width: `${Math.max(pct, 2)}%` }} />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>

        <Panel title="How far ahead people book" icon={<CalendarDays className="h-5 w-5 text-brand-gold" />}>
          <div className="flex h-full flex-col justify-center gap-6">
            <div>
              <p className="font-display text-5xl text-brand-gold">
                {data.avgLeadDays === null ? '—' : data.avgLeadDays}
                {data.avgLeadDays !== null && <span className="ml-2 text-lg text-white/50">days</span>}
              </p>
              <p className="mt-1 text-sm text-white/55">
                Average time between an order coming in and the trip itself. Short lead times mean the phone has to be
                answered quickly; long ones mean there is room to plan.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 border-t border-white/10 pt-5 text-center">
              {[
                ['Today', totals.today],
                ['This week', totals.thisWeek],
                ['Upcoming trips', totals.upcoming],
              ].map(([label, value]) => (
                <div key={String(label)}>
                  <p className="font-display text-2xl text-white">{value as number}</p>
                  <p className="text-[11px] uppercase tracking-wider text-white/45">{label as string}</p>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>
    </div>
  )
}
