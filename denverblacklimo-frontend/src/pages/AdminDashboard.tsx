import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Check, Clock, LogOut, Phone, Mail, FileText, Eye, EyeOff, Lock, Loader2, Send, X, Calendar,
  LayoutDashboard, BarChart3, PieChart as PieChartIcon, Inbox as InboxIcon, MessageSquare, Menu,
  RefreshCw, AlertTriangle, CalendarClock, Users, MapPin, ArrowUpDown, Home, Trash2, ExternalLink, ChevronDown,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Logo } from '../components/Logo'
import { useSiteSettings } from '../context/SiteSettingsContext'
import { CmsManager } from '../admin/CmsManager'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import {
  bookingRef, pickupAt, fmtDate, fmtTime, relativeDay, daysFromToday, isShortNotice,
  BOOKING_STATUSES, INQUIRY_STATUSES, statusStyle, matchesQuery,
} from '../admin/adminUtils'
import { ToastStack, SearchInput, FilterChip, CopyButton, StatCard, EmptyState, ConfirmDialog, ResultDialog, type Toast } from '../admin/AdminUI'
import { OPTION_CLASS } from '../lib/formStyles'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

/** Background refresh cadence — keeps a dashboard left open on a desk current. */
const AUTO_REFRESH_MS = 60_000

const DETAIL_LABELS: Record<string, string> = {
  fboName: 'FBO / Terminal', aircraftType: 'Aircraft Type', tailNumber: 'Tail Number',
  durationHours: 'Duration', serviceArea: 'Service Area', pickupType: 'Pickup Type',
  resort: 'Resort', estimatedTravelTime: 'Est. Travel Time', eventVenue: 'Event / Venue',
  eventDate: 'Event Date', eventTime: 'Event Time', returnPickupTime: 'Return Pickup Time', itinerary: 'Itinerary',
}

type Booking = {
  id: string; status: string; created_at: string; name: string; phone: string; email: string
  company?: string; details?: Record<string, string> | null; service_type: string; trip_type: string
  airport_direction: string; airline_name: string; terminal: string; flight_number: string
  pickup_date: string; pickup_time: string; pickup_location: string; dropoff_location: string
  additional_stops: string; passengers: string; luggage: string; vehicle_preference: string; special_requests: string
  return_pickup_location?: string; return_date?: string; return_time?: string
  return_flight_number?: string; return_airline_name?: string
}

type Inquiry = {
  id: string; type: 'Contact' | 'Quote'; status: string; created_at: string
  name: string; email: string; phone: string; service: string; event_date: string; message: string
}

type EmailTarget = { id: string; name: string; email: string; kind: 'booking' | 'inquiry' }

type Tab = 'overview' | 'bookings' | 'inbox' | 'content' | 'analytics'

type BookingSort = 'pickup' | 'newest'

const SORT_LABELS: Record<BookingSort, string> = {
  pickup: 'Sort by pickup date',
  newest: 'Sort by newest request',
}

export function AdminDashboard() {
  const [token, setToken] = useState<string | null>(() =>
    typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null
  )
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { settings, refreshSettings } = useSiteSettings()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [loadingLogin, setLoadingLogin] = useState(false)

  const [bookings, setBookings] = useState<Booking[]>([])
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  const [bookingQuery, setBookingQuery] = useState('')
  const [bookingStatusFilter, setBookingStatusFilter] = useState<string>('All')
  const [bookingSort, setBookingSort] = useState<BookingSort>('pickup')
  const [sortOpen, setSortOpen] = useState(false)
  const sortRef = useRef<HTMLDivElement>(null)
  const [inquiryQuery, setInquiryQuery] = useState('')
  const [inquiryStatusFilter, setInquiryStatusFilter] = useState<string>('All')

  const [emailModal, setEmailModal] = useState<EmailTarget | null>(null)
  const [emailSubject, setEmailSubject] = useState('')
  const [emailMessage, setEmailMessage] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailSuccess, setEmailSuccess] = useState('')
  const [emailSendError, setEmailSendError] = useState('')

  /** Row queued for deletion, held until the centred card is confirmed. */
  const [pendingDelete, setPendingDelete] = useState<{ kind: 'booking' | 'inquiry'; id: string; label: string } | null>(null)
  const [deleting, setDeleting] = useState(false)
  /** Outcome card shown in the middle of the screen after a delete or a save. */
  const [actionResult, setActionResult] = useState<{ ok: boolean; title: string; message?: string } | null>(null)

  const [toasts, setToasts] = useState<Toast[]>([])
  const toastSeq = useRef(0)
  const pushToast = useCallback((text: string, kind: 'ok' | 'err' = 'ok') => {
    const id = ++toastSeq.current
    setToasts((t) => [...t, { id, text, kind }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000)
  }, [])
  const dismissToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), [])

  const handleLogout = useCallback(() => {
    localStorage.removeItem('adminToken')
    setToken(null)
    setBookings([])
    setInquiries([])
  }, [])

  const authHeaders = useCallback(() => ({ Authorization: `Bearer ${token}` }), [token])

  /**
   * Any 401/403 means the 24h token expired. The message goes on the login card, not a toast —
   * the toast stack unmounts with the dashboard, so it would never be seen.
   */
  const handleAuthFailure = useCallback(() => {
    handleLogout()
    setError('Your session expired. Please sign in again.')
  }, [handleLogout])

  const loadData = useCallback(
    async (mode: 'initial' | 'manual' | 'auto' = 'manual') => {
      if (!token) return
      if (mode === 'initial') setLoading(true)
      if (mode === 'manual') setRefreshing(true)
      try {
        const [bRes, iRes] = await Promise.all([
          fetch(`${API_URL}/bookings`, { headers: authHeaders() }),
          fetch(`${API_URL}/inquiries`, { headers: authHeaders() }),
        ])
        if (bRes.status === 401 || bRes.status === 403 || iRes.status === 401 || iRes.status === 403) {
          handleAuthFailure()
          return
        }
        if (bRes.ok) setBookings(await bRes.json())
        if (iRes.ok) setInquiries(await iRes.json())
        if (!bRes.ok || !iRes.ok) throw new Error('Request failed')
        setLastUpdated(new Date())
      } catch {
        if (mode !== 'auto') pushToast('Could not reach the server. Check your connection.', 'err')
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [token, authHeaders, handleAuthFailure, pushToast]
  )

  useEffect(() => {
    if (token) loadData('initial')
  }, [token, loadData])

  useEffect(() => {
    if (!sortOpen) return
    const onDown = (e: MouseEvent) => {
      if (!sortRef.current?.contains(e.target as Node)) setSortOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSortOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [sortOpen])

  // Poll quietly so a dashboard left open still shows new bookings.
  useEffect(() => {
    if (!token) return
    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') loadData('auto')
    }, AUTO_REFRESH_MS)
    return () => clearInterval(timer)
  }, [token, loadData])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setEmailError(''); setPasswordError('')
    let isValid = true
    if (!email) { setEmailError('Email address is required'); isValid = false }
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setEmailError('Please enter a valid email address'); isValid = false }
    if (!password) { setPasswordError('Password is required'); isValid = false }
    if (!isValid) return
    setLoadingLogin(true)
    try {
      const res = await fetch(`${API_URL}/admin/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
      if (res.ok) { const { token } = await res.json(); localStorage.setItem('adminToken', token); setToken(token) }
      else if (res.status === 429) setError('Too many sign-in attempts. Please wait a few minutes and try again.')
      else setError('Incorrect email or password. Please try again.')
    } catch { setError('Failed to connect to server. Please try again later.') }
    finally { setLoadingLogin(false) }
  }

  const updateBookingStatus = async (id: string, status: string, previous: string) => {
    // Optimistic — the row updates instantly and rolls back if the server disagrees.
    setBookings((list) => list.map((b) => (b.id === id ? { ...b, status } : b)))
    try {
      const res = await fetch(`${API_URL}/bookings/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ status }),
      })
      if (res.status === 401 || res.status === 403) return handleAuthFailure()
      if (!res.ok) throw new Error('failed')
      pushToast(`${bookingRef(id)} marked ${status}.`)
    } catch {
      setBookings((list) => list.map((b) => (b.id === id ? { ...b, status: previous } : b)))
      pushToast('Could not update the status. Please try again.', 'err')
    }
  }

  const updateInquiryStatus = async (id: string, status: string, previous: string) => {
    setInquiries((list) => list.map((q) => (q.id === id ? { ...q, status } : q)))
    try {
      const res = await fetch(`${API_URL}/inquiries/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ status }),
      })
      if (res.status === 401 || res.status === 403) return handleAuthFailure()
      if (!res.ok) throw new Error('failed')
      pushToast(`Message marked ${status}.`)
    } catch {
      setInquiries((list) => list.map((q) => (q.id === id ? { ...q, status: previous } : q)))
      pushToast('Could not update the message. Please try again.', 'err')
    }
  }

  /** Permanently removes a booking or a message. Confirmed via the centred card first. */
  const confirmDelete = async () => {
    if (!pendingDelete) return
    const { kind, id, label } = pendingDelete
    setDeleting(true)
    try {
      const path = kind === 'booking' ? 'bookings' : 'inquiries'
      const res = await fetch(`${API_URL}/${path}/${id}`, { method: 'DELETE', headers: authHeaders() })
      if (res.status === 401 || res.status === 403) {
        setPendingDelete(null)
        return handleAuthFailure()
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'The server rejected the request.')
      }
      if (kind === 'booking') setBookings((list) => list.filter((b) => b.id !== id))
      else setInquiries((list) => list.filter((q) => q.id !== id))
      setExpanded((cur) => (cur === id ? null : cur))
      setActionResult({
        ok: true,
        title: kind === 'booking' ? 'Booking deleted' : 'Message deleted',
        message: `${label} has been permanently removed.`,
      })
    } catch (err) {
      setActionResult({
        ok: false,
        title: 'Could not delete',
        message: err instanceof Error ? err.message : 'Something went wrong. Please try again.',
      })
    } finally {
      setDeleting(false)
      setPendingDelete(null)
    }
  }

  const openEmailModal = (t: EmailTarget) => {
    setEmailModal(t)
    setEmailSubject(t.kind === 'booking' ? 'Your Denver Black Limo Booking – Update' : 'Denver Black Limo – Response to Your Inquiry')
    setEmailMessage(`Dear ${t.name ? t.name.split(' ')[0] : 'Valued Client'},\n\nThank you for reaching out to Denver Black Limo.\n\n`)
    setEmailSuccess(''); setEmailSendError('')
  }

  // Escape closes the compose modal.
  useEffect(() => {
    if (!emailModal) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setEmailModal(null) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [emailModal])

  const handleSendEmail = async () => {
    if (!emailModal || !emailSubject || !emailMessage) return
    setSendingEmail(true); setEmailSendError(''); setEmailSuccess('')
    try {
      const path = emailModal.kind === 'booking' ? 'bookings' : 'inquiries'
      const res = await fetch(`${API_URL}/${path}/${emailModal.id}/email`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ subject: emailSubject, message: emailMessage }) })
      if (res.status === 401 || res.status === 403) return handleAuthFailure()
      if (res.ok) {
        const target = emailModal
        setEmailSuccess(`Email sent to ${target.email}`)
        pushToast(`Email sent to ${target.email}.`)
        if (target.kind === 'inquiry') {
          const current = inquiries.find((q) => q.id === target.id)?.status || 'New'
          updateInquiryStatus(target.id, 'Replied', current)
        }
        setTimeout(() => setEmailModal((m) => (m && m.id === target.id ? null : m)), 1200)
      }
      else setEmailSendError((await res.json()).error || 'Failed to send email.')
    } catch { setEmailSendError('Network error. Please try again.') }
    finally { setSendingEmail(false) }
  }

  // ── Derived data ────────────────────────────────────────────────────────────
  const enriched = useMemo(
    () => bookings.map((b) => {
      const at = pickupAt(b.pickup_date, b.pickup_time)
      return { b, at, days: at ? daysFromToday(at) : null, urgent: isShortNotice(at) }
    }),
    [bookings]
  )

  const todaysTrips = useMemo(
    () => enriched.filter((e) => e.days === 0 && e.b.status !== 'Cancelled').sort((a, b) => (a.at?.getTime() || 0) - (b.at?.getTime() || 0)),
    [enriched]
  )
  const upcomingTrips = useMemo(
    () => enriched.filter((e) => e.days !== null && e.days > 0 && e.days <= 7 && e.b.status !== 'Cancelled').sort((a, b) => (a.at?.getTime() || 0) - (b.at?.getTime() || 0)),
    [enriched]
  )
  const pendingCount = bookings.filter((b) => b.status === 'Pending').length
  const newInquiries = inquiries.filter((i) => i.status === 'New').length
  const urgentTrips = useMemo(() => enriched.filter((e) => e.urgent && e.b.status !== 'Cancelled'), [enriched])

  const visibleBookings = useMemo(() => {
    const filtered = enriched.filter(({ b }) => {
      if (bookingStatusFilter !== 'All' && b.status !== bookingStatusFilter) return false
      return matchesQuery(
        [b.name, b.email, b.phone, b.company, b.service_type, b.pickup_location, b.dropoff_location, b.vehicle_preference, bookingRef(b.id)],
        bookingQuery
      )
    })
    return filtered.sort((x, y) => {
      if (bookingSort === 'newest') return new Date(y.b.created_at).getTime() - new Date(x.b.created_at).getTime()
      // Upcoming trips first (soonest at the top), then past trips most-recent-first,
      // then anything with an unreadable date. An operator cares about what's next, not what's done.
      if (!x.at) return 1
      if (!y.at) return -1
      const xPast = (x.days ?? 0) < 0
      const yPast = (y.days ?? 0) < 0
      if (xPast !== yPast) return xPast ? 1 : -1
      return xPast ? y.at.getTime() - x.at.getTime() : x.at.getTime() - y.at.getTime()
    })
  }, [enriched, bookingQuery, bookingStatusFilter, bookingSort])

  const visibleInquiries = useMemo(
    () => inquiries.filter((q) => {
      if (inquiryStatusFilter !== 'All' && q.status !== inquiryStatusFilter) return false
      return matchesQuery([q.name, q.email, q.phone, q.service, q.message, q.type], inquiryQuery)
    }),
    [inquiries, inquiryQuery, inquiryStatusFilter]
  )

  const serviceData = Object.entries(bookings.reduce((acc, b) => { acc[b.service_type] = (acc[b.service_type] || 0) + 1; return acc }, {} as Record<string, number>)).map(([name, count]) => ({ name, count }))
  const statusData = Object.entries(bookings.reduce((acc, b) => { acc[b.status] = (acc[b.status] || 0) + 1; return acc }, {} as Record<string, number>)).map(([name, value]) => ({ name, value }))
  const PIE_COLORS = ['#e8c547', '#4ade80', '#3b82f6', '#f43f5e', '#a855f7']

  const goToBookings = (status: string) => { setActiveTab('bookings'); setBookingStatusFilter(status); setBookingQuery('') }

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-black relative overflow-hidden p-4">
        <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-brand-gold/5 via-brand-black to-brand-black opacity-60"></div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="z-10 w-full max-w-[420px] rounded-2xl border border-white/10 bg-brand-surface/95 p-8 shadow-2xl backdrop-blur-xl md:p-10">
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="flex items-center justify-center gap-3"><Logo iconOnly /><span className="font-display text-xl font-bold tracking-widest text-brand-gold uppercase">Denver Black Limo</span></div>
            <div className="mt-6 w-full border-t border-brand-gold/20 pt-6">
              <h1 className="font-display text-2xl font-bold tracking-wide text-brand-gold text-center">Welcome Back!</h1>
              <p className="mt-2 text-sm leading-relaxed text-white/60 text-center">Sign in to access the admin dashboard.</p>
            </div>
          </div>
          <form onSubmit={handleLogin} className="space-y-5">
            {error && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="rounded border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</motion.div>}
            <div className="space-y-1">
              <label className="text-xs font-semibold tracking-widest text-brand-gold/80 uppercase">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-white/40"><Mail className="h-4 w-4" /></div>
                <input type="email" autoComplete="username" disabled={loadingLogin} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" className={`w-full rounded border bg-brand-black/50 py-2.5 pl-10 pr-4 text-sm text-white outline-none transition-colors focus:border-brand-gold/50 ${emailError ? 'border-red-500/50' : 'border-white/10'}`} />
              </div>
              {emailError && <p className="text-xs text-red-300">{emailError}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold tracking-widest text-brand-gold/80 uppercase">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-white/40"><Lock className="h-4 w-4" /></div>
                <input type={showPassword ? 'text' : 'password'} autoComplete="current-password" disabled={loadingLogin} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" className={`w-full rounded border bg-brand-black/50 py-2.5 pl-10 pr-10 text-sm text-white outline-none transition-colors focus:border-brand-gold/50 ${passwordError ? 'border-red-500/50' : 'border-white/10'}`} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute inset-y-0 right-0 flex items-center pr-3 text-brand-gold transition-colors">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
              </div>
              {passwordError && <p className="text-xs text-red-300">{passwordError}</p>}
            </div>
            <button type="submit" disabled={loadingLogin} className="group relative flex w-full items-center justify-center rounded bg-gold-gradient py-3 text-sm font-bold tracking-widest text-brand-black transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:hover:scale-100">
              {loadingLogin ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> SIGNING IN...</> : 'SIGN IN'}
            </button>
          </form>
        </motion.div>
      </div>
    )
  }

  const navItems: { id: Tab; label: string; icon: React.ReactNode; badge?: number; badgeTone?: 'gold' | 'alert' }[] = [
    { id: 'overview', label: 'Overview', icon: <Home className="h-4 w-4" />, badge: urgentTrips.length || undefined, badgeTone: 'alert' },
    { id: 'bookings', label: 'Bookings', icon: <Calendar className="h-4 w-4" />, badge: pendingCount || undefined },
    { id: 'inbox', label: 'Inbox', icon: <InboxIcon className="h-4 w-4" />, badge: newInquiries || undefined },
    { id: 'content', label: 'Content (CMS)', icon: <LayoutDashboard className="h-4 w-4" /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="h-4 w-4" /> },
  ]

  const RefreshButton = () => (
    <div className="flex items-center gap-3">
      {lastUpdated && (
        <span className="hidden text-xs text-white/40 sm:inline">
          Updated {lastUpdated.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
        </span>
      )}
      <button
        onClick={() => loadData('manual')}
        disabled={refreshing}
        className="flex items-center gap-2 rounded border border-brand-gold/30 px-4 py-2 text-xs font-bold uppercase tracking-wider text-brand-gold transition-colors hover:bg-brand-gold/10 disabled:opacity-60"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
      </button>
    </div>
  )

  return (
    <div className="flex h-screen bg-brand-black overflow-hidden font-body text-white">
      {sidebarOpen && (
        <button aria-label="Close menu" onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" />
      )}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-white/10 bg-brand-surface flex flex-col shadow-2xl shadow-black/50 transition-transform duration-300 lg:static lg:z-10 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-white/10 flex items-center gap-3">
          <Logo iconOnly />
          <span className="font-display text-sm font-bold tracking-widest text-brand-gold uppercase">Workspace</span>
          <button onClick={() => setSidebarOpen(false)} aria-label="Close menu" className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/10 text-white/60 lg:hidden"><X className="h-4 w-4" /></button>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <button key={item.id} onClick={() => { setActiveTab(item.id); setSidebarOpen(false) }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors ${activeTab === item.id ? 'bg-brand-gold/10 text-brand-gold font-medium' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}>
              {item.icon} <span className="flex-1 text-left">{item.label}</span>
              {item.badge ? (
                <span className={`rounded-full px-2 py-0.5 text-xs ${item.badgeTone === 'alert' ? 'bg-amber-500/25 text-amber-200' : 'bg-brand-gold/20 text-brand-gold'}`}>{item.badge}</span>
              ) : null}
            </button>
          ))}
        </nav>
        <div className="space-y-1 border-t border-white/10 p-4">
          <Link
            to="/"
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm text-white/60 transition-colors hover:bg-white/5 hover:text-brand-gold-light"
          >
            <ExternalLink className="h-4 w-4" /> Back to Site
          </Link>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-red-400/80 hover:bg-red-400/10 hover:text-red-400 transition-colors"><LogOut className="h-4 w-4" /> Logout</button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto relative">
        {/* Top bar — hamburger on mobile, plus a link back to the live site on every screen.
            The sidebar link alone was easy to miss, and invisible on mobile until you open the drawer. */}
        <div className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-white/10 bg-brand-surface/95 px-4 py-3 backdrop-blur">
          <div className="flex items-center gap-2 lg:hidden"><Logo iconOnly /><span className="font-display text-xs font-bold uppercase tracking-widest text-brand-gold">Workspace</span></div>
          <p className="hidden text-xs uppercase tracking-widest text-white/40 lg:block">Denver Black Limo · Admin</p>
          <div className="flex items-center gap-2">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg border border-brand-gold/50 px-3 py-2 text-xs font-bold uppercase tracking-wider text-brand-gold-light transition hover:bg-brand-gold/10"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">View Public Site</span>
              <span className="sm:hidden">Site</span>
            </a>
            <button onClick={() => setSidebarOpen(true)} aria-label="Open menu" className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-brand-gold/40 text-brand-gold-light active:scale-95 lg:hidden"><Menu className="h-5 w-5" /></button>
          </div>
        </div>
        <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-brand-gold/5 via-brand-black to-brand-black opacity-30 pointer-events-none"></div>
        <div className="relative z-10 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">

          {/* OVERVIEW */}
          {activeTab === 'overview' && (
            <div>
              <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <h1 className="font-display text-3xl text-brand-gold">Today at a Glance</h1>
                  <p className="mt-1 text-sm text-white/60">Everything that needs your attention, in one place.</p>
                </div>
                <RefreshButton />
              </div>

              {loading ? (
                <div className="flex items-center justify-center p-12 text-white/50"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : (
                <div className="space-y-8">
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard label="Trips today" value={todaysTrips.length} icon={<CalendarClock className="h-5 w-5" />} tone={todaysTrips.length ? 'gold' : 'default'} hint={todaysTrips.length ? 'Scheduled for today' : 'Nothing on the road today'} />
                    <StatCard label="Next 7 days" value={upcomingTrips.length} icon={<Calendar className="h-5 w-5" />} hint="Upcoming pickups" />
                    <StatCard label="Awaiting reply" value={pendingCount} icon={<Clock className="h-5 w-5" />} tone={pendingCount ? 'gold' : 'default'} hint="Bookings still Pending" onClick={() => goToBookings('Pending')} />
                    <StatCard label="New messages" value={newInquiries} icon={<InboxIcon className="h-5 w-5" />} tone={newInquiries ? 'gold' : 'default'} hint="Unread in the inbox" onClick={() => { setActiveTab('inbox'); setInquiryStatusFilter('New') }} />
                  </div>

                  {urgentTrips.length > 0 && (
                    <div className="rounded-xl border border-amber-500/50 bg-amber-500/10 p-5">
                      <h2 className="flex items-center gap-2 font-display text-lg text-amber-200"><AlertTriangle className="h-5 w-5" /> Short notice — pickup within 3 hours</h2>
                      <div className="mt-3 space-y-2">
                        {urgentTrips.map(({ b, at }) => (
                          <div key={b.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-amber-50">
                            <span className="font-mono text-xs text-amber-200/80">{bookingRef(b.id)}</span>
                            <span className="font-semibold">{b.name}</span>
                            <span className="text-amber-100/80">{at ? fmtTime(b.pickup_time) : ''} · {b.pickup_location || 'No pickup address'}</span>
                            <a href={`tel:${b.phone}`} className="ml-auto rounded border border-amber-400/40 px-2 py-1 text-xs hover:bg-amber-400/15">Call</a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid gap-6 lg:grid-cols-2">
                    <div className="rounded-xl border border-white/10 bg-brand-surface p-6 shadow-lg shadow-black/20">
                      <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-white"><CalendarClock className="h-5 w-5 text-brand-gold" /> Today&apos;s schedule</h2>
                      {todaysTrips.length === 0 ? (
                        <p className="py-8 text-center text-sm text-white/40">No pickups scheduled for today.</p>
                      ) : (
                        <ul className="space-y-3">
                          {todaysTrips.map(({ b }) => (
                            <li key={b.id} className="flex items-start gap-3 rounded-lg border border-white/5 bg-brand-black/40 p-3">
                              <span className="rounded bg-brand-gold/15 px-2 py-1 font-mono text-xs text-brand-gold">{fmtTime(b.pickup_time)}</span>
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-semibold text-white">{b.name} <span className="ml-1 text-xs font-normal text-white/40">{bookingRef(b.id)}</span></p>
                                <p className="truncate text-xs text-white/55">{b.pickup_location} → {b.dropoff_location}</p>
                              </div>
                              <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${statusStyle(b.status)}`}>{b.status}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="rounded-xl border border-white/10 bg-brand-surface p-6 shadow-lg shadow-black/20">
                      <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-white"><InboxIcon className="h-5 w-5 text-brand-gold" /> Latest messages</h2>
                      {inquiries.length === 0 ? (
                        <p className="py-8 text-center text-sm text-white/40">No messages yet.</p>
                      ) : (
                        <ul className="space-y-3">
                          {inquiries.slice(0, 5).map((q) => (
                            <li key={q.id} className="flex items-start gap-3 rounded-lg border border-white/5 bg-brand-black/40 p-3">
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-semibold text-white">{q.name} <span className="ml-1 text-xs font-normal text-white/40">{q.type}</span></p>
                                <p className="truncate text-xs text-white/55">{q.message}</p>
                              </div>
                              <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${statusStyle(q.status)}`}>{q.status}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* BOOKINGS */}
          {activeTab === 'bookings' && (
            <div>
              <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div><h1 className="font-display text-3xl text-brand-gold">Booking Requests</h1><p className="text-sm text-white/60 mt-1">Manage and respond to all incoming transportation requests.</p></div>
                <RefreshButton />
              </div>

              <div className="mb-6 space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <SearchInput value={bookingQuery} onChange={setBookingQuery} placeholder="Search name, phone, reference, address…" />
                  <div className="relative self-start" ref={sortRef}>
                    <button
                      onClick={() => setSortOpen((v) => !v)}
                      aria-expanded={sortOpen}
                      aria-haspopup="listbox"
                      className="flex items-center gap-2 rounded-lg border border-white/10 bg-brand-black px-3 py-2.5 text-xs text-white/70 transition hover:border-white/25 hover:text-white"
                    >
                      <ArrowUpDown className="h-3.5 w-3.5 text-brand-gold" />
                      {SORT_LABELS[bookingSort]}
                      <ChevronDown className={`h-3.5 w-3.5 transition-transform ${sortOpen ? 'rotate-180' : ''}`} />
                    </button>
                    <AnimatePresence>
                      {sortOpen && (
                        <motion.ul
                          role="listbox"
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 4 }}
                          transition={{ duration: 0.15 }}
                          className="absolute left-0 top-full z-40 mt-1 w-56 overflow-hidden rounded-lg border border-white/10 bg-brand-surface shadow-2xl"
                        >
                          {(Object.keys(SORT_LABELS) as BookingSort[]).map((key) => (
                            <li key={key}>
                              <button
                                role="option"
                                aria-selected={bookingSort === key}
                                onClick={() => { setBookingSort(key); setSortOpen(false) }}
                                className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs transition ${
                                  bookingSort === key
                                    ? 'bg-brand-gold/15 text-brand-gold-light'
                                    : 'text-white/70 hover:bg-white/5 hover:text-white'
                                }`}
                              >
                                <Check className={`h-3.5 w-3.5 ${bookingSort === key ? 'opacity-100' : 'opacity-0'}`} />
                                {SORT_LABELS[key]}
                              </button>
                            </li>
                          ))}
                        </motion.ul>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <FilterChip label="All" count={bookings.length} active={bookingStatusFilter === 'All'} onClick={() => setBookingStatusFilter('All')} />
                  {BOOKING_STATUSES.map((s) => (
                    <FilterChip key={s} label={s} count={bookings.filter((b) => b.status === s).length} active={bookingStatusFilter === s} onClick={() => setBookingStatusFilter(s)} />
                  ))}
                </div>
              </div>

              {loading && bookings.length === 0 ? (
                <div className="flex items-center justify-center p-12 text-white/50"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : bookings.length === 0 ? (
                <EmptyState icon={<Calendar className="h-12 w-12" />} text="No bookings found." hint="New requests from the website appear here automatically." />
              ) : visibleBookings.length === 0 ? (
                <EmptyState icon={<Calendar className="h-12 w-12" />} text="No bookings match your filters." hint="Try clearing the search or choosing a different status." />
              ) : (
                <div className="space-y-4">
                  {visibleBookings.map(({ b, at, days, urgent }) => (
                    <div key={b.id} className={`overflow-hidden rounded-xl border bg-brand-surface shadow-lg shadow-black/20 ${urgent ? 'border-amber-500/50' : 'border-white/10'}`}>
                      <div className="flex cursor-pointer flex-col justify-between gap-4 p-5 hover:bg-white/5 sm:flex-row sm:items-center transition-colors" onClick={() => setExpanded(expanded === b.id ? null : b.id)}>
                        <div className="flex min-w-0 items-center gap-4">
                          <div className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-full border ${statusStyle(b.status)}`}>
                            {b.status === 'Pending' ? <Clock className="h-5 w-5" /> : b.status === 'Cancelled' ? <X className="h-5 w-5" /> : <Check className="h-5 w-5" />}
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="truncate text-lg font-bold text-white">{b.name}</h3>
                              <span className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[11px] text-white/50">{bookingRef(b.id)}</span>
                              {urgent && <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-200">Short notice</span>}
                              {days === 0 && !urgent && <span className="rounded-full bg-brand-gold/20 px-2 py-0.5 text-[10px] font-bold uppercase text-brand-gold">Today</span>}
                            </div>
                            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-white/60">
                              <span className="text-white/80">{fmtDate(b.pickup_date)}{b.pickup_time ? ` · ${fmtTime(b.pickup_time)}` : ''}</span>
                              {at && <span className="text-brand-gold/70">({relativeDay(at)})</span>}
                              <span className="h-1 w-1 rounded-full bg-white/30" />
                              <span>{b.service_type}</span>
                            </p>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          <a href={`tel:${b.phone}`} onClick={(e) => e.stopPropagation()} title={`Call ${b.phone}`} className="flex items-center gap-1.5 rounded border border-white/15 px-3 py-2 text-xs text-white/70 transition-colors hover:border-brand-gold/40 hover:text-brand-gold"><Phone className="h-3.5 w-3.5" /> Call</a>
                          <button onClick={(e) => { e.stopPropagation(); openEmailModal({ id: b.id, name: b.name, email: b.email, kind: 'booking' }) }} className="flex items-center gap-1.5 rounded border border-brand-gold/40 bg-brand-gold/5 px-3 py-2 text-xs text-brand-gold hover:bg-brand-gold/15 transition-colors"><Send className="h-3.5 w-3.5" /> Email</button>
                          <select value={b.status} onChange={(e) => { e.stopPropagation(); updateBookingStatus(b.id, e.target.value, b.status) }} onClick={(e) => e.stopPropagation()} className="border border-white/10 bg-brand-black px-3 py-2 rounded text-xs text-white focus:border-brand-gold outline-none">
                            {BOOKING_STATUSES.map((s) => <option key={s} value={s} className={OPTION_CLASS}>{s}</option>)}
                          </select>
                          <button
                            onClick={(e) => { e.stopPropagation(); setPendingDelete({ kind: 'booking', id: b.id, label: `${b.name} (${bookingRef(b.id)})` }) }}
                            title="Delete this booking"
                            aria-label={`Delete booking ${bookingRef(b.id)}`}
                            className="rounded border border-white/15 p-2 text-white/40 transition-colors hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-300"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      {expanded === b.id && (
                        <div className="border-t border-white/10 bg-black/40 p-6">
                          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                            <div className="space-y-3">
                              <h4 className="text-xs font-bold tracking-widest text-brand-gold flex items-center gap-2"><FileText className="h-4 w-4" /> CONTACT INFO</h4>
                              <div className="space-y-2 text-sm text-white/80 p-4 bg-brand-surface rounded border border-white/5">
                                <p className="flex items-center gap-2"><Phone className="h-4 w-4 shrink-0 text-brand-gold/60" /> <a href={`tel:${b.phone}`} className="hover:text-brand-gold">{b.phone}</a> <CopyButton value={b.phone} label="phone number" /></p>
                                <p className="flex items-center gap-2"><Mail className="h-4 w-4 shrink-0 text-brand-gold/60" /> <a href={`mailto:${b.email}`} className="truncate hover:text-brand-gold">{b.email}</a> <CopyButton value={b.email} label="email address" /></p>
                                {b.company && <p className="flex items-center gap-3"><FileText className="h-4 w-4 text-brand-gold/60" /> {b.company}</p>}
                                <p className="flex items-center gap-2 border-t border-white/5 pt-2 text-xs text-white/50">Reference: <span className="font-mono text-white/70">{bookingRef(b.id)}</span> <CopyButton value={bookingRef(b.id)} label="reference" /></p>
                                <p className="text-xs text-white/40">Requested {new Date(b.created_at).toLocaleString()}</p>
                              </div>
                            </div>
                            <div className="space-y-3">
                              <h4 className="text-xs font-bold tracking-widest text-brand-gold flex items-center gap-2"><MapPin className="h-4 w-4" /> TRIP DETAILS</h4>
                              <div className="space-y-1 text-sm text-white/80 p-4 bg-brand-surface rounded border border-white/5">
                                <p><span className="text-white/40">Type:</span> {b.trip_type}</p>
                                <p><span className="text-white/40">Date:</span> {fmtDate(b.pickup_date)}{b.pickup_time ? ` at ${fmtTime(b.pickup_time)}` : ''}</p>
                                <p><span className="text-white/40">Pickup:</span> {b.pickup_location}</p>
                                <p><span className="text-white/40">Drop-off:</span> {b.dropoff_location}</p>
                                {b.additional_stops && <p><span className="text-white/40">Stops:</span> {b.additional_stops}</p>}
                                {(b.return_date || b.return_flight_number) && (
                                  <div className="mt-3 border-t border-white/10 pt-3">
                                    <p className="mb-1 font-bold text-brand-gold">RETURN TRIP</p>
                                    {b.return_date && <p><span className="text-white/40">Date:</span> {fmtDate(b.return_date)}{b.return_time ? ` at ${fmtTime(b.return_time)}` : ''}</p>}
                                    {b.return_pickup_location && <p><span className="text-white/40">Pickup:</span> {b.return_pickup_location}</p>}
                                    {(b.return_flight_number || b.return_airline_name) && (
                                      <p><span className="text-white/40">Flight:</span> {[b.return_flight_number, b.return_airline_name].filter(Boolean).join(' · ')}</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="space-y-3">
                              <h4 className="text-xs font-bold tracking-widest text-brand-gold flex items-center gap-2"><Users className="h-4 w-4" /> PREFERENCES</h4>
                              <div className="space-y-1 text-sm text-white/80 p-4 bg-brand-surface rounded border border-white/5">
                                <p><span className="text-white/40">Passengers:</span> {b.passengers} (Luggage: {b.luggage || '0'})</p>
                                <p><span className="text-white/40">Vehicle:</span> {b.vehicle_preference || 'No Preference'}</p>
                                {b.airline_name && (<div className="mt-3 pt-3 border-t border-white/10"><p className="font-bold text-brand-gold mb-1">AIRPORT ({b.airport_direction})</p><p>Airline: {b.airline_name}</p><p>Flight: {b.flight_number}</p>{b.terminal && <p>Terminal: {b.terminal}</p>}</div>)}
                              </div>
                            </div>
                            {b.details && Object.keys(b.details).some((k) => DETAIL_LABELS[k] && b.details![k]) && (
                              <div className="md:col-span-2 lg:col-span-3 space-y-2">
                                <h4 className="flex items-center gap-2 text-xs font-bold tracking-widest text-brand-gold"><FileText className="h-4 w-4" /> TRIP SPECIFICS</h4>
                                <div className="grid gap-x-8 gap-y-1 text-sm text-white/80 p-4 bg-brand-surface rounded border border-white/5 sm:grid-cols-2 lg:grid-cols-3">
                                  {Object.entries(DETAIL_LABELS).map(([key, label]) => (b.details && b.details[key] ? <p key={key}><span className="text-white/40">{label}:</span> {b.details[key]}</p> : null))}
                                </div>
                              </div>
                            )}
                            {b.special_requests && (<div className="md:col-span-2 lg:col-span-3 space-y-2"><h4 className="flex items-center gap-2 text-xs font-bold tracking-widest text-brand-gold">SPECIAL REQUESTS</h4><p className="text-sm text-white/80 whitespace-pre-wrap p-4 bg-brand-surface rounded border border-white/5">{b.special_requests}</p></div>)}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* INBOX */}
          {activeTab === 'inbox' && (
            <div>
              <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div><h1 className="font-display text-3xl text-brand-gold">Inbox</h1><p className="text-sm text-white/60 mt-1">Contact messages and quote requests from your website.</p></div>
                <RefreshButton />
              </div>

              <div className="mb-6 space-y-3">
                <SearchInput value={inquiryQuery} onChange={setInquiryQuery} placeholder="Search name, email, message…" />
                <div className="flex flex-wrap gap-2">
                  <FilterChip label="All" count={inquiries.length} active={inquiryStatusFilter === 'All'} onClick={() => setInquiryStatusFilter('All')} />
                  {INQUIRY_STATUSES.map((s) => (
                    <FilterChip key={s} label={s} count={inquiries.filter((q) => q.status === s).length} active={inquiryStatusFilter === s} onClick={() => setInquiryStatusFilter(s)} />
                  ))}
                </div>
              </div>

              {loading && inquiries.length === 0 ? (
                <div className="flex items-center justify-center p-12 text-white/50"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : inquiries.length === 0 ? (
                <EmptyState icon={<InboxIcon className="h-12 w-12" />} text="No messages yet." hint="Contact and quote forms deliver here." />
              ) : visibleInquiries.length === 0 ? (
                <EmptyState icon={<InboxIcon className="h-12 w-12" />} text="No messages match your filters." />
              ) : (
                <div className="space-y-4">
                  {visibleInquiries.map((q) => (
                    <div key={q.id} className="border border-white/10 bg-brand-surface rounded-xl overflow-hidden shadow-lg shadow-black/20">
                      <div className="flex cursor-pointer flex-col justify-between gap-4 p-5 hover:bg-white/5 sm:flex-row sm:items-center transition-colors" onClick={() => setExpanded(expanded === q.id ? null : q.id)}>
                        <div className="flex min-w-0 items-center gap-4">
                          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border ${q.type === 'Quote' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' : 'bg-brand-gold/20 text-brand-gold border-brand-gold/30'}`}>{q.type === 'Quote' ? <MessageSquare className="h-5 w-5" /> : <Mail className="h-5 w-5" />}</div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="truncate text-lg font-bold text-white">{q.name}</h3>
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${q.type === 'Quote' ? 'bg-blue-500/20 text-blue-300' : 'bg-brand-gold/20 text-brand-gold'}`}>{q.type}</span>
                              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${statusStyle(q.status)}`}>{q.status}</span>
                            </div>
                            <p className="mt-0.5 truncate text-sm text-white/55">{q.message}</p>
                            <p className="mt-0.5 flex items-center gap-2 text-xs text-white/40">{q.service && <><span>{q.service}</span><span className="h-1 w-1 rounded-full bg-white/30" /></>}<span>{new Date(q.created_at).toLocaleString()}</span></p>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          <button onClick={(e) => { e.stopPropagation(); openEmailModal({ id: q.id, name: q.name, email: q.email, kind: 'inquiry' }) }} className="flex items-center gap-1.5 rounded border border-brand-gold/40 bg-brand-gold/5 px-3 py-2 text-xs text-brand-gold hover:bg-brand-gold/15 transition-colors"><Send className="h-3.5 w-3.5" /> Reply</button>
                          <select value={q.status} onChange={(e) => { e.stopPropagation(); updateInquiryStatus(q.id, e.target.value, q.status) }} onClick={(e) => e.stopPropagation()} className="border border-white/10 bg-brand-black px-3 py-2 rounded text-xs text-white focus:border-brand-gold outline-none">
                            {INQUIRY_STATUSES.map((s) => <option key={s} value={s} className={OPTION_CLASS}>{s}</option>)}
                          </select>
                          <button
                            onClick={(e) => { e.stopPropagation(); setPendingDelete({ kind: 'inquiry', id: q.id, label: `${q.type} from ${q.name}` }) }}
                            title="Delete this message"
                            aria-label={`Delete message from ${q.name}`}
                            className="rounded border border-white/15 p-2 text-white/40 transition-colors hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-300"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      {expanded === q.id && (
                        <div className="border-t border-white/10 bg-black/40 p-6">
                          <div className="grid gap-6 md:grid-cols-3">
                            <div className="space-y-2 text-sm text-white/80">
                              <h4 className="text-xs font-bold tracking-widest text-brand-gold">CONTACT</h4>
                              <p className="flex items-center gap-2"><Phone className="h-4 w-4 shrink-0 text-brand-gold/60" /> {q.phone ? <><a href={`tel:${q.phone}`} className="hover:text-brand-gold">{q.phone}</a><CopyButton value={q.phone} label="phone number" /></> : '—'}</p>
                              <p className="flex items-center gap-2"><Mail className="h-4 w-4 shrink-0 text-brand-gold/60" /> <a href={`mailto:${q.email}`} className="truncate hover:text-brand-gold">{q.email}</a> <CopyButton value={q.email} label="email address" /></p>
                              {q.event_date && <p className="flex items-center gap-2"><Calendar className="h-4 w-4 text-brand-gold/60" /> {fmtDate(q.event_date)}</p>}
                            </div>
                            <div className="md:col-span-2 space-y-2"><h4 className="text-xs font-bold tracking-widest text-brand-gold">MESSAGE</h4><p className="text-sm text-white/80 whitespace-pre-wrap p-4 bg-brand-surface rounded border border-white/5">{q.message}</p></div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CONTENT (CMS) */}
          {activeTab === 'content' && <CmsManager token={token} settings={settings} refresh={refreshSettings} onResult={setActionResult} />}

          {/* ANALYTICS */}
          {activeTab === 'analytics' && (
            <div>
              <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div><h1 className="font-display text-3xl text-brand-gold">Dashboard Analytics</h1><p className="text-sm text-white/60 mt-1">Overview of booking statistics and popular services.</p></div>
                <div className="sm:text-right"><p className="text-sm text-white/60 uppercase tracking-wider">Total Bookings</p><p className="text-4xl font-display text-brand-gold">{bookings.length}</p></div>
              </div>
              {bookings.length === 0 ? (
                <EmptyState text="Not enough data to display analytics." hint="Charts appear once the first booking arrives." />
              ) : (
                <div className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard label="Confirmed" value={bookings.filter((b) => b.status === 'Confirmed').length} icon={<Check className="h-5 w-5" />} />
                    <StatCard label="Completed" value={bookings.filter((b) => b.status === 'Completed').length} icon={<Check className="h-5 w-5" />} />
                    <StatCard label="Pending" value={pendingCount} icon={<Clock className="h-5 w-5" />} />
                    <StatCard label="Total messages" value={inquiries.length} icon={<InboxIcon className="h-5 w-5" />} />
                  </div>
                  <div className="grid gap-6 lg:grid-cols-2">
                    <div className="border border-white/10 bg-brand-surface rounded-xl p-6 shadow-2xl shadow-black/20">
                      <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2"><BarChart3 className="h-5 w-5 text-brand-gold" /> Popular Services</h2>
                      <div className="h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={serviceData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}><CartesianGrid strokeDasharray="3 3" stroke="#ffffff1a" vertical={false} /><XAxis dataKey="name" stroke="#ffffff66" tick={{ fill: '#ffffff66', fontSize: 12 }} tickMargin={10} angle={-15} textAnchor="end" /><YAxis stroke="#ffffff66" tick={{ fill: '#ffffff66', fontSize: 12 }} allowDecimals={false} /><RechartsTooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px' }} itemStyle={{ color: '#e8c547' }} /><Bar dataKey="count" fill="#e8c547" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
                    </div>
                    <div className="border border-white/10 bg-brand-surface rounded-xl p-6 shadow-2xl shadow-black/20">
                      <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2"><PieChartIcon className="h-5 w-5 text-brand-gold" /> Booking Status</h2>
                      <div className="h-80"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={statusData} cx="50%" cy="50%" innerRadius={80} outerRadius={120} paddingAngle={2} dataKey="value" label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>{statusData.map((_entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}</Pie><RechartsTooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px' }} itemStyle={{ color: '#fff' }} /></PieChart></ResponsiveContainer></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <AnimatePresence>
        {emailModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setEmailModal(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ duration: 0.2 }} className="w-full max-w-lg rounded-xl border border-white/10 bg-brand-surface shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-white/10 p-5 bg-brand-black/50">
                <div><h2 className="font-display text-lg text-brand-gold">Send Email</h2><p className="text-xs text-white/50 mt-0.5">To: {emailModal.name} &lt;{emailModal.email}&gt;</p></div>
                <button onClick={() => setEmailModal(null)} aria-label="Close" className="text-white/40 hover:text-white transition-colors rounded p-1 hover:bg-white/10"><X className="h-5 w-5" /></button>
              </div>
              <div className="p-6 space-y-5">
                <div><label className="text-xs font-semibold tracking-widest text-brand-gold/80 uppercase mb-2 block">Subject</label><input type="text" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} className="w-full border border-white/10 bg-brand-black px-4 py-3 text-sm text-white outline-none focus:border-brand-gold rounded transition-colors" /></div>
                <div><label className="text-xs font-semibold tracking-widest text-brand-gold/80 uppercase mb-2 block">Message</label><textarea value={emailMessage} onChange={(e) => setEmailMessage(e.target.value)} rows={8} className="w-full border border-white/10 bg-brand-black px-4 py-3 text-sm text-white outline-none focus:border-brand-gold rounded transition-colors resize-none" /></div>
                {emailSuccess && <div className="flex items-center gap-2 rounded border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-300"><Check className="h-4 w-4 shrink-0" /> {emailSuccess}</div>}
                {emailSendError && <div className="rounded border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{emailSendError}</div>}
              </div>
              <div className="flex items-center justify-end gap-3 border-t border-white/10 p-5 bg-brand-black/30">
                <button onClick={() => setEmailModal(null)} className="px-4 py-2 text-sm text-white/60 hover:text-white hover:bg-white/5 rounded transition-colors">Cancel</button>
                <button onClick={handleSendEmail} disabled={sendingEmail || !emailSubject || !emailMessage || !!emailSuccess} className="flex items-center gap-2 rounded bg-gold-gradient px-6 py-2.5 text-sm font-bold tracking-wider text-brand-black disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-[0.98]">{sendingEmail ? <><Loader2 className="h-4 w-4 animate-spin" /> SENDING...</> : <><Send className="h-4 w-4" /> SEND EMAIL</>}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        busy={deleting}
        title={pendingDelete?.kind === 'booking' ? 'Delete this booking?' : 'Delete this message?'}
        message={
          <>
            <span className="font-semibold text-white">{pendingDelete?.label}</span> will be removed
            permanently. This cannot be undone.
          </>
        }
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      <ResultDialog result={actionResult} onClose={() => setActionResult(null)} />

      <ToastStack toasts={toasts} dismiss={dismissToast} />
    </div>
  )
}
