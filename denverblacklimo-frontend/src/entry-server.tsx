import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom'
import { AppRoutes } from './App'
import { SiteSettingsProvider } from './context/SiteSettingsContext'
import { metaFor, SITE_URL } from './components/Seo'

/**
 * Render a route to an HTML string for build-time prerendering (SSG).
 *
 * `settings` is the live CMS content the build fetched. Without it the static
 * HTML shows whatever the built-in defaults say, which is what Google indexes
 * and what a visitor sees until the page loads its own data — so an edited
 * price could sit wrong in the markup indefinitely.
 */
export function render(url: string, settings?: Record<string, unknown>): string {
  return renderToString(
    <StaticRouter location={url}>
      <SiteSettingsProvider initialData={settings}>
        <AppRoutes />
      </SiteSettingsProvider>
    </StaticRouter>
  )
}

/** Per-route <title>/description used to rewrite the HTML head at prerender time. */
export function getRouteMeta(pathname: string) {
  return metaFor(pathname)
}

export { SITE_URL }
