import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Download, RefreshCw, WifiOff, X } from 'lucide-react'

/**
 * The parts of the admin app that only exist because it is installable.
 *
 * Three small things, deliberately kept out of the dashboard itself: whether
 * the device is online, whether a new version is waiting, and whether the app
 * can be installed. None of them touch business logic, and the dashboard works
 * unchanged if this file is removed.
 */

const SW_URL = '/sw.js'
/** The service worker's scope, and the only path the admin app runs under. */
const SW_SCOPE = '/admin'
const INSTALL_DISMISSED = 'dblAdminInstallDismissed'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * Puts the PWA tags on the page, whichever HTML shell was served.
 *
 * prerender.mjs writes them into /admin/index.html, but a request for /admin
 * with no trailing slash falls through to the SPA shell, which is the same
 * index.html the marketing site uses and deliberately carries no manifest.
 * That URL is exactly what start_url points at, so relying on the prerendered
 * copy alone would leave the app uninstallable from its own launch URL.
 *
 * Doing it here also keeps the tags where they belong: they exist only while
 * the admin is mounted, so no customer reading the fleet page is ever offered
 * "Install Denver Black Limo Admin".
 */
export function usePwaMeta() {
  useEffect(() => {
    const added: Element[] = []

    const ensure = (selector: string, make: () => Element) => {
      if (document.head.querySelector(selector)) return
      const el = make()
      document.head.appendChild(el)
      added.push(el)
    }

    const meta = (name: string, content: string) => () => {
      const el = document.createElement('meta')
      el.setAttribute('name', name)
      el.setAttribute('content', content)
      return el
    }

    ensure('link[rel="manifest"]', () => {
      const el = document.createElement('link')
      el.rel = 'manifest'
      el.href = '/manifest.webmanifest'
      return el
    })
    ensure('link[rel="apple-touch-icon"][href="/icons/apple-touch-icon.png"]', () => {
      const el = document.createElement('link')
      el.rel = 'apple-touch-icon'
      el.href = '/icons/apple-touch-icon.png'
      return el
    })
    ensure('meta[name="apple-mobile-web-app-capable"]', meta('apple-mobile-web-app-capable', 'yes'))
    ensure('meta[name="apple-mobile-web-app-title"]', meta('apple-mobile-web-app-title', 'DBL Admin'))
    ensure(
      'meta[name="apple-mobile-web-app-status-bar-style"]',
      meta('apple-mobile-web-app-status-bar-style', 'black-translucent')
    )
    ensure('meta[name="mobile-web-app-capable"]', meta('mobile-web-app-capable', 'yes'))
    ensure('meta[name="application-name"]', meta('application-name', 'DBL Admin'))

    // Without viewport-fit=cover the safe-area insets all report zero, and the
    // header sits under the notch on an installed iPhone.
    const viewport = document.head.querySelector('meta[name="viewport"]')
    const previousViewport = viewport?.getAttribute('content') ?? null
    if (viewport && !/viewport-fit/.test(previousViewport || '')) {
      viewport.setAttribute('content', `${previousViewport}, viewport-fit=cover`)
    }

    return () => {
      for (const el of added) el.remove()
      if (viewport && previousViewport !== null) viewport.setAttribute('content', previousViewport)
    }
  }, [])
}

/** Registers the worker and reports when a newer one is waiting to take over. */
export function useServiceWorker() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null)
  const reloading = useRef(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    // Vite serves no worker in development, and registering one there would
    // cache a dev bundle that is meant to be replaced on every keystroke.
    if (import.meta.env.DEV) return

    let cancelled = false

    navigator.serviceWorker
      .register(SW_URL, { scope: SW_SCOPE })
      .then((reg) => {
        if (cancelled) return
        if (reg.waiting) setWaiting(reg.waiting)
        reg.addEventListener('updatefound', () => {
          const installing = reg.installing
          if (!installing) return
          installing.addEventListener('statechange', () => {
            // A worker that reaches "installed" while another controls the page
            // is a new version holding back, waiting to be let in.
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              setWaiting(installing)
            }
          })
        })
      })
      .catch(() => {
        // An admin tool that cannot register a worker is still a working admin
        // tool. Nothing here is worth interrupting the user over.
      })

    const onControllerChange = () => {
      if (reloading.current) return
      reloading.current = true
      window.location.reload()
    }
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)

    return () => {
      cancelled = true
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
    }
  }, [])

  const update = useCallback(() => {
    if (!waiting) return
    waiting.postMessage({ type: 'SKIP_WAITING' })
  }, [waiting])

  return { updateReady: Boolean(waiting), update }
}

/** Whether the browser currently believes it has a connection. */
export function useOnline() {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))
  useEffect(() => {
    const up = () => setOnline(true)
    const down = () => setOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', down)
    }
  }, [])
  return online
}

/**
 * A bar across the top when the connection drops.
 *
 * It says what it actually means — that saving will fail — rather than the
 * usual vague "you are offline". The office needs to know not to type a booking
 * it is about to lose.
 */
export function OfflineBanner({ online }: { online: boolean }) {
  if (online) return null

  // Plain conditional rendering with a CSS transition, deliberately not an
  // animated mount. A warning that the office cannot save work has to be
  // visible the instant it is true — if it depended on an animation finishing
  // it would be invisible wherever animations are throttled, disabled, or
  // switched off for reduced motion, which is precisely the wrong failure.
  return (
    <div
      role="status"
      aria-live="assertive"
      className="border-b border-amber-500/40 bg-amber-500/15 motion-safe:animate-[fadeIn_150ms_ease-out]"
    >
      <p className="flex items-center justify-center gap-2 px-4 py-2 text-center text-xs font-medium text-amber-200">
        <WifiOff className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        You&rsquo;re offline. You can read what is already on screen, but saving and sending will not work.
      </p>
    </div>
  )
}

/** Offered when a deploy has landed, never applied underneath the user. */
export function UpdateToast({ show, onUpdate }: { show: boolean; onUpdate: () => void }) {
  const [dismissed, setDismissed] = useState(false)
  if (!show || dismissed) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed inset-x-4 z-[60] rounded-lg border border-brand-gold/40 bg-brand-surface p-4 shadow-2xl sm:left-auto sm:right-6 sm:w-80"
      style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
      role="status"
    >
      <div className="flex items-start gap-3">
        <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 text-brand-gold" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white">A new version is available</p>
          <p className="mt-0.5 text-xs text-white/50">
            Reload when you are ready &mdash; anything you are part-way through will be lost.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={onUpdate}
              className="rounded bg-gold-gradient px-3 py-2 text-xs font-bold uppercase tracking-widest text-brand-black"
            >
              Reload
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="rounded border border-white/15 px-3 py-2 text-xs text-white/60 transition hover:text-white"
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/**
 * The install offer.
 *
 * Shown once, dismissible, and remembered — an admin tool that nags to be
 * installed every morning is worse than one that never asks. iOS fires no
 * beforeinstallprompt event at all, so nothing appears there; those users are
 * told how to install in the documentation instead.
 */
export function InstallPrompt() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [hidden, setHidden] = useState(true)

  useEffect(() => {
    try {
      if (localStorage.getItem(INSTALL_DISMISSED)) return
    } catch {
      // Private browsing can throw on access; treat it as "not dismissed".
    }
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setPrompt(e as BeforeInstallPromptEvent)
      setHidden(false)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  const dismiss = () => {
    setHidden(true)
    try {
      localStorage.setItem(INSTALL_DISMISSED, '1')
    } catch {
      /* nothing worth reporting */
    }
  }

  if (hidden || !prompt) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed inset-x-4 z-[60] rounded-lg border border-white/15 bg-brand-surface p-4 shadow-2xl sm:left-auto sm:right-6 sm:w-80"
      style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
    >
      <div className="flex items-start gap-3">
        <img src="/icons/icon-192.png" alt="" className="h-9 w-9 shrink-0 rounded" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white">Install DBL Admin</p>
          <p className="mt-0.5 text-xs text-white/50">
            Add it to your home screen to open it like an app, without the browser bar.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={async () => {
                await prompt.prompt()
                await prompt.userChoice
                dismiss()
              }}
              className="inline-flex items-center gap-1.5 rounded bg-gold-gradient px-3 py-2 text-xs font-bold uppercase tracking-widest text-brand-black"
            >
              <Download className="h-3.5 w-3.5" /> Install
            </button>
            <button
              onClick={dismiss}
              className="rounded border border-white/15 px-3 py-2 text-xs text-white/60 transition hover:text-white"
            >
              Not now
            </button>
          </div>
        </div>
        <button onClick={dismiss} aria-label="Dismiss" className="rounded p-1 text-white/30 transition hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  )
}
