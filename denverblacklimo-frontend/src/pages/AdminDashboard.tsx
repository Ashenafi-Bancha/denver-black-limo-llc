import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Clock, LogOut, Phone, Mail, FileText, Eye, EyeOff, Lock, Loader2, Send, X, Calendar, LayoutDashboard, BarChart3, PieChart as PieChartIcon, Inbox as InboxIcon, MessageSquare, Menu } from 'lucide-react'
import { Logo } from '../components/Logo'
import { useSiteSettings } from '../context/SiteSettingsContext'
import { CmsManager } from '../admin/CmsManager'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

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
}

type Inquiry = {
  id: string; type: 'Contact' | 'Quote'; status: string; created_at: string
  name: string; email: string; phone: string; service: string; event_date: string; message: string
}

type EmailTarget = { id: string; name: string; email: string; kind: 'booking' | 'inquiry' }

type Tab = 'bookings' | 'inbox' | 'content' | 'analytics'

export function AdminDashboard() {
  const [token, setToken] = useState<string | null>(() =>
    typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null
  )
  const [activeTab, setActiveTab] = useState<Tab>('bookings')
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
  const [expanded, setExpanded] = useState<string | null>(null)

  const [emailModal, setEmailModal] = useState<EmailTarget | null>(null)
  const [emailSubject, setEmailSubject] = useState('')
  const [emailMessage, setEmailMessage] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailSuccess, setEmailSuccess] = useState('')
  const [emailSendError, setEmailSendError] = useState('')

  useEffect(() => {
    if (token) { fetchBookings(); fetchInquiries() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

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
      else setError('Incorrect email or password. Please try again.')
    } catch { setError('Failed to connect to server. Please try again later.') }
    finally { setLoadingLogin(false) }
  }

  const handleLogout = () => { localStorage.removeItem('adminToken'); setToken(null); setBookings([]); setInquiries([]) }

  const authHeaders = () => ({ Authorization: `Bearer ${token}` })

  const fetchBookings = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/bookings`, { headers: authHeaders() })
      if (res.status === 401 || res.status === 403) { handleLogout(); return }
      if (res.ok) setBookings(await res.json())
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }

  const fetchInquiries = async () => {
    try {
      const res = await fetch(`${API_URL}/inquiries`, { headers: authHeaders() })
      if (res.ok) setInquiries(await res.json())
    } catch (err) { console.error(err) }
  }

  const updateBookingStatus = async (id: string, status: string) => {
    try { await fetch(`${API_URL}/bookings/${id}/status`, { method: 'PUT', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ status }) }); fetchBookings() } catch (err) { console.error(err) }
  }
  const updateInquiryStatus = async (id: string, status: string) => {
    try { await fetch(`${API_URL}/inquiries/${id}/status`, { method: 'PUT', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ status }) }); fetchInquiries() } catch (err) { console.error(err) }
  }

  const openEmailModal = (t: EmailTarget) => {
    setEmailModal(t)
    setEmailSubject(t.kind === 'booking' ? 'Your Denver Black Limo Booking – Update' : 'Denver Black Limo – Response to Your Inquiry')
    setEmailMessage(`Dear ${t.name ? t.name.split(' ')[0] : 'Valued Client'},\n\nThank you for reaching out to Denver Black Limo.\n\n`)
    setEmailSuccess(''); setEmailSendError('')
  }

  const handleSendEmail = async () => {
    if (!emailModal || !emailSubject || !emailMessage) return
    setSendingEmail(true); setEmailSendError(''); setEmailSuccess('')
    try {
      const path = emailModal.kind === 'booking' ? 'bookings' : 'inquiries'
      const res = await fetch(`${API_URL}/${path}/${emailModal.id}/email`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ subject: emailSubject, message: emailMessage }) })
      if (res.ok) { setEmailSuccess(`Email sent to ${emailModal.email}`); if (emailModal.kind === 'inquiry') updateInquiryStatus(emailModal.id, 'Replied') }
      else setEmailSendError((await res.json()).error || 'Failed to send email.')
    } catch { setEmailSendError('Network error. Please try again.') }
    finally { setSendingEmail(false) }
  }

  // Analytics
  const serviceData = Object.entries(bookings.reduce((acc, b) => { acc[b.service_type] = (acc[b.service_type] || 0) + 1; return acc }, {} as Record<string, number>)).map(([name, count]) => ({ name, count }))
  const statusData = Object.entries(bookings.reduce((acc, b) => { acc[b.status] = (acc[b.status] || 0) + 1; return acc }, {} as Record<string, number>)).map(([name, value]) => ({ name, value }))
  const PIE_COLORS = ['#e8c547', '#4ade80', '#3b82f6', '#f43f5e', '#a855f7']
  const newInquiries = inquiries.filter((i) => i.status === 'New').length

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
                <input type="email" disabled={loadingLogin} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" className={`w-full rounded border bg-brand-black/50 py-2.5 pl-10 pr-4 text-sm text-white outline-none transition-colors focus:border-brand-gold/50 ${emailError ? 'border-red-500/50' : 'border-white/10'}`} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold tracking-widest text-brand-gold/80 uppercase">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-white/40"><Lock className="h-4 w-4" /></div>
                <input type={showPassword ? 'text' : 'password'} disabled={loadingLogin} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" className={`w-full rounded border bg-brand-black/50 py-2.5 pl-10 pr-10 text-sm text-white outline-none transition-colors focus:border-brand-gold/50 ${passwordError ? 'border-red-500/50' : 'border-white/10'}`} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-brand-gold transition-colors">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
              </div>
            </div>
            <button type="submit" disabled={loadingLogin} className="group relative flex w-full items-center justify-center rounded bg-gold-gradient py-3 text-sm font-bold tracking-widest text-brand-black transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:hover:scale-100">
              {loadingLogin ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> SIGNING IN...</> : 'SIGN IN'}
            </button>
          </form>
        </motion.div>
      </div>
    )
  }

  const navItems: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'bookings', label: 'Bookings', icon: <Calendar className="h-4 w-4" />, badge: bookings.length || undefined },
    { id: 'inbox', label: 'Inbox', icon: <InboxIcon className="h-4 w-4" />, badge: newInquiries || undefined },
    { id: 'content', label: 'Content (CMS)', icon: <LayoutDashboard className="h-4 w-4" /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="h-4 w-4" /> },
  ]

  return (
    <div className="flex h-screen bg-brand-black overflow-hidden font-body text-white">
      {/* Mobile backdrop */}
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
              {item.badge ? <span className="rounded-full bg-brand-gold/20 px-2 py-0.5 text-xs text-brand-gold">{item.badge}</span> : null}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-red-400/80 hover:bg-red-400/10 hover:text-red-400 transition-colors"><LogOut className="h-4 w-4" /> Logout</button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto relative">
        {/* Mobile top bar */}
        <div className="sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-brand-surface/95 px-4 py-3 backdrop-blur lg:hidden">
          <div className="flex items-center gap-2"><Logo iconOnly /><span className="font-display text-xs font-bold uppercase tracking-widest text-brand-gold">Workspace</span></div>
          <button onClick={() => setSidebarOpen(true)} aria-label="Open menu" className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-brand-gold/40 text-brand-gold-light active:scale-95"><Menu className="h-5 w-5" /></button>
        </div>
        <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-brand-gold/5 via-brand-black to-brand-black opacity-30 pointer-events-none"></div>
        <div className="relative z-10 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">

          {/* BOOKINGS */}
          {activeTab === 'bookings' && (
            <div>
              <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div><h1 className="font-display text-3xl text-brand-gold">Booking Requests</h1><p className="text-sm text-white/60 mt-1">Manage and respond to all incoming transportation requests.</p></div>
                <button onClick={fetchBookings} className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-brand-gold border border-brand-gold/30 rounded hover:bg-brand-gold/10 transition-colors">Refresh</button>
              </div>
              {loading && bookings.length === 0 ? (
                <div className="flex items-center justify-center p-12 text-white/50"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : bookings.length === 0 ? (
                <EmptyState icon={<Calendar className="h-12 w-12" />} text="No bookings found." />
              ) : (
                <div className="space-y-4">
                  {bookings.map((b) => (
                    <div key={b.id} className="border border-white/10 bg-brand-surface rounded-xl overflow-hidden shadow-lg shadow-black/20">
                      <div className="flex cursor-pointer flex-col justify-between gap-4 p-5 hover:bg-white/5 sm:flex-row sm:items-center transition-colors" onClick={() => setExpanded(expanded === b.id ? null : b.id)}>
                        <div className="flex items-center gap-4">
                          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${b.status === 'Pending' ? 'bg-brand-gold/20 text-brand-gold border border-brand-gold/30' : 'bg-green-500/20 text-green-400 border border-green-500/30'}`}>{b.status === 'Pending' ? <Clock className="h-5 w-5" /> : <Check className="h-5 w-5" />}</div>
                          <div><h3 className="font-bold text-lg text-white">{b.name}</h3><p className="text-sm text-white/60 flex items-center gap-2"><span>{b.service_type}</span><span className="h-1 w-1 bg-white/30 rounded-full" /><span>{new Date(b.created_at).toLocaleDateString()}</span></p></div>
                        </div>
                        <div className="flex items-center gap-3">
                          <button onClick={(e) => { e.stopPropagation(); openEmailModal({ id: b.id, name: b.name, email: b.email, kind: 'booking' }) }} className="flex items-center gap-1.5 rounded border border-brand-gold/40 bg-brand-gold/5 px-3 py-2 text-xs text-brand-gold hover:bg-brand-gold/15 transition-colors"><Send className="h-3.5 w-3.5" /> Email</button>
                          <select value={b.status} onChange={(e) => { e.stopPropagation(); updateBookingStatus(b.id, e.target.value) }} onClick={(e) => e.stopPropagation()} className="border border-white/10 bg-brand-black px-3 py-2 rounded text-xs text-white focus:border-brand-gold outline-none">
                            {['Pending', 'Reviewed', 'Quoted', 'Confirmed', 'Completed'].map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                      </div>
                      {expanded === b.id && (
                        <div className="border-t border-white/10 bg-black/40 p-6">
                          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                            <div className="space-y-3">
                              <h4 className="text-xs font-bold tracking-widest text-brand-gold flex items-center gap-2"><FileText className="h-4 w-4" /> CONTACT INFO</h4>
                              <div className="space-y-2 text-sm text-white/80 p-4 bg-brand-surface rounded border border-white/5">
                                <p className="flex items-center gap-3"><Phone className="h-4 w-4 text-brand-gold/60" /> {b.phone}</p>
                                <p className="flex items-center gap-3"><Mail className="h-4 w-4 text-brand-gold/60" /> {b.email}</p>
                                {b.company && <p className="flex items-center gap-3"><FileText className="h-4 w-4 text-brand-gold/60" /> {b.company}</p>}
                              </div>
                            </div>
                            <div className="space-y-3">
                              <h4 className="text-xs font-bold tracking-widest text-brand-gold flex items-center gap-2"><FileText className="h-4 w-4" /> TRIP DETAILS</h4>
                              <div className="space-y-1 text-sm text-white/80 p-4 bg-brand-surface rounded border border-white/5">
                                <p><span className="text-white/40">Type:</span> {b.trip_type}</p>
                                <p><span className="text-white/40">Date:</span> {b.pickup_date} at {b.pickup_time}</p>
                                <p><span className="text-white/40">Pickup:</span> {b.pickup_location}</p>
                                <p><span className="text-white/40">Drop-off:</span> {b.dropoff_location}</p>
                                {b.additional_stops && <p><span className="text-white/40">Stops:</span> {b.additional_stops}</p>}
                              </div>
                            </div>
                            <div className="space-y-3">
                              <h4 className="text-xs font-bold tracking-widest text-brand-gold flex items-center gap-2"><FileText className="h-4 w-4" /> PREFERENCES</h4>
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
              <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div><h1 className="font-display text-3xl text-brand-gold">Inbox</h1><p className="text-sm text-white/60 mt-1">Contact messages and quote requests from your website.</p></div>
                <button onClick={fetchInquiries} className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-brand-gold border border-brand-gold/30 rounded hover:bg-brand-gold/10 transition-colors">Refresh</button>
              </div>
              {inquiries.length === 0 ? (
                <EmptyState icon={<InboxIcon className="h-12 w-12" />} text="No messages yet." />
              ) : (
                <div className="space-y-4">
                  {inquiries.map((q) => (
                    <div key={q.id} className="border border-white/10 bg-brand-surface rounded-xl overflow-hidden shadow-lg shadow-black/20">
                      <div className="flex cursor-pointer flex-col justify-between gap-4 p-5 hover:bg-white/5 sm:flex-row sm:items-center transition-colors" onClick={() => setExpanded(expanded === q.id ? null : q.id)}>
                        <div className="flex items-center gap-4">
                          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border ${q.type === 'Quote' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' : 'bg-brand-gold/20 text-brand-gold border-brand-gold/30'}`}>{q.type === 'Quote' ? <MessageSquare className="h-5 w-5" /> : <Mail className="h-5 w-5" />}</div>
                          <div>
                            <div className="flex items-center gap-2"><h3 className="font-bold text-lg text-white">{q.name}</h3><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${q.type === 'Quote' ? 'bg-blue-500/20 text-blue-300' : 'bg-brand-gold/20 text-brand-gold'}`}>{q.type}</span>{q.status === 'New' && <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-green-300">New</span>}</div>
                            <p className="text-sm text-white/60 flex items-center gap-2 mt-0.5">{q.service && <><span>{q.service}</span><span className="h-1 w-1 bg-white/30 rounded-full" /></>}<span>{new Date(q.created_at).toLocaleDateString()}</span></p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <button onClick={(e) => { e.stopPropagation(); openEmailModal({ id: q.id, name: q.name, email: q.email, kind: 'inquiry' }) }} className="flex items-center gap-1.5 rounded border border-brand-gold/40 bg-brand-gold/5 px-3 py-2 text-xs text-brand-gold hover:bg-brand-gold/15 transition-colors"><Send className="h-3.5 w-3.5" /> Reply</button>
                          <select value={q.status} onChange={(e) => { e.stopPropagation(); updateInquiryStatus(q.id, e.target.value) }} onClick={(e) => e.stopPropagation()} className="border border-white/10 bg-brand-black px-3 py-2 rounded text-xs text-white focus:border-brand-gold outline-none">
                            {['New', 'Read', 'Replied', 'Closed'].map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                      </div>
                      {expanded === q.id && (
                        <div className="border-t border-white/10 bg-black/40 p-6">
                          <div className="grid gap-6 md:grid-cols-3">
                            <div className="space-y-2 text-sm text-white/80"><h4 className="text-xs font-bold tracking-widest text-brand-gold">CONTACT</h4><p className="flex items-center gap-2"><Phone className="h-4 w-4 text-brand-gold/60" /> {q.phone || '—'}</p><p className="flex items-center gap-2"><Mail className="h-4 w-4 text-brand-gold/60" /> {q.email}</p>{q.event_date && <p className="flex items-center gap-2"><Calendar className="h-4 w-4 text-brand-gold/60" /> {q.event_date}</p>}</div>
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
          {activeTab === 'content' && <CmsManager token={token} settings={settings} refresh={refreshSettings} />}

          {/* ANALYTICS */}
          {activeTab === 'analytics' && (
            <div>
              <div className="mb-8 flex justify-between items-center">
                <div><h1 className="font-display text-3xl text-brand-gold">Dashboard Analytics</h1><p className="text-sm text-white/60 mt-1">Overview of booking statistics and popular services.</p></div>
                <div className="text-right"><p className="text-sm text-white/60 uppercase tracking-wider">Total Bookings</p><p className="text-4xl font-display text-brand-gold">{bookings.length}</p></div>
              </div>
              {bookings.length === 0 ? (
                <EmptyState text="Not enough data to display analytics." />
              ) : (
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="border border-white/10 bg-brand-surface rounded-xl p-6 shadow-2xl shadow-black/20">
                    <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2"><BarChart3 className="h-5 w-5 text-brand-gold" /> Popular Services</h2>
                    <div className="h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={serviceData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}><CartesianGrid strokeDasharray="3 3" stroke="#ffffff1a" vertical={false} /><XAxis dataKey="name" stroke="#ffffff66" tick={{ fill: '#ffffff66', fontSize: 12 }} tickMargin={10} angle={-15} textAnchor="end" /><YAxis stroke="#ffffff66" tick={{ fill: '#ffffff66', fontSize: 12 }} /><RechartsTooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px' }} itemStyle={{ color: '#e8c547' }} /><Bar dataKey="count" fill="#e8c547" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
                  </div>
                  <div className="border border-white/10 bg-brand-surface rounded-xl p-6 shadow-2xl shadow-black/20">
                    <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2"><PieChartIcon className="h-5 w-5 text-brand-gold" /> Booking Status</h2>
                    <div className="h-80"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={statusData} cx="50%" cy="50%" innerRadius={80} outerRadius={120} paddingAngle={2} dataKey="value" label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>{statusData.map((_entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}</Pie><RechartsTooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px' }} itemStyle={{ color: '#fff' }} /></PieChart></ResponsiveContainer></div>
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
                <button onClick={() => setEmailModal(null)} className="text-white/40 hover:text-white transition-colors rounded p-1 hover:bg-white/10"><X className="h-5 w-5" /></button>
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
    </div>
  )
}

function EmptyState({ icon, text }: { icon?: React.ReactNode; text: string }) {
  return (
    <div className="border border-white/10 bg-brand-surface rounded-xl p-12 text-center text-white/50 flex flex-col items-center">
      {icon && <div className="text-white/20 mb-4">{icon}</div>}
      <p>{text}</p>
    </div>
  )
}
