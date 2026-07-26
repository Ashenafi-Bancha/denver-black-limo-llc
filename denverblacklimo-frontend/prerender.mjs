// Build-time prerendering (SSG).
// Runs after `vite build` (client) and the SSR build. For each route it renders
// the app to HTML, rewrites the <head> meta for that route, injects the body into
// the index.html template, and writes dist/<route>/index.html — so every page
// ships as ready-to-index HTML.
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const SITE = 'https://denverblacklimo.llc'
const DIST = path.resolve('dist')
const template = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8')

const { render, getRouteMeta } = await import(
  pathToFileURL(path.resolve('dist-server/entry-server.js')).href
)

const SERVICE_SLUGS = [
  'airport-transportation', 'private-aviation-fbo', 'executive-corporate', 'hourly-chauffeur',
  'mountain-resort', 'wedding-transportation', 'concert-red-rocks', 'sporting-events',
  'bachelor-bachelorette', 'private-city-tours', 'brewery-winery-whiskey', 'group-transportation',
]
const AREA_SLUGS = [
  'denver-metro', 'boulder-northern-colorado', 'colorado-springs-southern',
  'mountain-resorts-airports', 'fort-collins', 'grand-junction',
]

const ROUTES = [
  '/', '/services', '/fleet', '/service-areas', '/about', '/contact', '/book', '/quote',
  ...SERVICE_SLUGS.map((s) => `/services/${s}`),
  ...AREA_SLUGS.map((s) => `/service-areas/${s}`),
  '/admin',
]

const escHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const escAttr = (s) => escHtml(s).replace(/"/g, '&quot;')

function buildHtml(route) {
  const meta = getRouteMeta(route)
  const canonical = SITE + (route === '/' ? '/' : route)
  let html = template
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${escHtml(meta.title)}</title>`)
    .replace(/(<meta name="description" content=)"[^"]*"/, `$1"${escAttr(meta.description)}"`)
    .replace(/(<link rel="canonical" href=)"[^"]*"/, `$1"${canonical}"`)
    .replace(/(<meta property="og:title" content=)"[^"]*"/, `$1"${escAttr(meta.title)}"`)
    .replace(/(<meta property="og:description" content=)"[^"]*"/, `$1"${escAttr(meta.description)}"`)
    .replace(/(<meta property="og:url" content=)"[^"]*"/, `$1"${canonical}"`)
    .replace(/(<meta name="twitter:title" content=)"[^"]*"/, `$1"${escAttr(meta.title)}"`)
    .replace(/(<meta name="twitter:description" content=)"[^"]*"/, `$1"${escAttr(meta.description)}"`)

  if (route === '/admin') {
    html = html.replace(/(<meta name="robots" content=)"[^"]*"/, `$1"noindex, nofollow"`)
  }

  let body = ''
  try {
    body = render(route)
  } catch (err) {
    console.warn(`  ! SSR render failed for ${route} (will hydrate on client): ${err.message}`)
  }
  return html.replace('<!--app-html-->', body)
}

let ok = 0
for (const route of ROUTES) {
  const html = buildHtml(route)
  const outDir = route === '/' ? DIST : path.join(DIST, route)
  fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(path.join(outDir, 'index.html'), html)
  ok++
}
console.log(`✔ Prerendered ${ok} routes to static HTML.`)
