import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Resets scroll to the top of the page on every route change so nav/footer
 * links land on the section's hero rather than wherever the user was scrolled.
 * Skips when a `#hash` is present so in-page anchor scrolling still works.
 */
export function ScrollToTop() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (hash) return
    // Jump instantly (bypass the global `scroll-behavior: smooth`) on navigation.
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior })
  }, [pathname, hash])

  return null
}
