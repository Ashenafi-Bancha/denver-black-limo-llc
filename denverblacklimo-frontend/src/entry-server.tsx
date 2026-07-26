import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom'
import { AppRoutes } from './App'
import { SiteSettingsProvider } from './context/SiteSettingsContext'
import { metaFor, SITE_URL } from './components/Seo'

/** Render a route to an HTML string for build-time prerendering (SSG). */
export function render(url: string): string {
  return renderToString(
    <StaticRouter location={url}>
      <SiteSettingsProvider>
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
