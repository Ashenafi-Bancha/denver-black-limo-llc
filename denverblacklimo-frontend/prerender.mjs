// Build-time prerendering (SSG).
// Runs after `vite build` (client) and the SSR build. For each route it renders
// the app to HTML, rewrites the <head> meta for that route, injects the body into
// the index.html template, and writes dist/<route>/index.html — so every page
// ships as ready-to-index HTML.
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const SITE = 'https://denverblacklimo.llc'
const DIST = path.resolve('dist')
// The template is dist/index.html, which is also one of this script's outputs.
// `vite build` normally rewrites it first, but strip our own injection anyway so
// running this script twice cannot stack duplicate tags.
let template = fs
  .readFileSync(path.join(DIST, 'index.html'), 'utf8')
  .replace(/\s*<script src="\/assets\/site-settings\.[^"]*"><\/script>/g, '')

const { render, getRouteMeta } = await import(
  pathToFileURL(path.resolve('dist-server/entry-server.js')).href
)

// ── Live CMS content, baked in at build time ──────────────────────────────
// Without this the static HTML carries the built-in defaults, so an edit made
// in the admin never reaches the markup Google indexes — an out-of-date price
// could sit in the page source indefinitely. A failure here is not fatal: the
// build falls back to defaults, which is exactly how it behaved before.
const SETTINGS_URL = process.env.PRERENDER_API_URL || `${SITE}/api/settings`

async function fetchSettings() {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15000)
  try {
    const res = await fetch(SETTINGS_URL, { signal: controller.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    const keys = Object.keys(data)
    if (!keys.length) throw new Error('empty response')
    console.log(`✔ Fetched live CMS content (${keys.length} keys) for prerendering.`)
    return data
  } catch (err) {
    console.warn(
      `  ! Could not fetch CMS content (${err.message}) — prerendering with built-in defaults.`
    )
    return null
  } finally {
    clearTimeout(timer)
  }
}

const settings = await fetchSettings()

// Ship the same content to the browser. The client must start from what the
// server rendered or hydration mismatches, and a shared hashed file is fetched
// once and cached across all routes rather than inlined into all 38 pages.
if (settings) {
  const json = JSON.stringify(settings)
  const hash = crypto.createHash('sha256').update(json).digest('hex').slice(0, 8)
  const assetPath = `/assets/site-settings.${hash}.js`
  fs.writeFileSync(
    path.join(DIST, assetPath),
    `window.__SITE_SETTINGS__=${json};\n`
  )
  // A classic script runs before the app's module bundle, which is deferred.
  template = template.replace('</head>', `  <script src="${assetPath}"></script>\n  </head>`)
  console.log(`✔ Wrote ${assetPath} (${Math.round(json.length / 1024)}KB).`)
}

const SERVICE_SLUGS = [
  'airport-transportation', 'private-aviation-fbo', 'executive-corporate', 'hourly-chauffeur',
  'mountain-resort', 'wedding-transportation', 'concert-red-rocks', 'sporting-events',
  'bachelor-bachelorette', 'private-city-tours', 'brewery-winery-whiskey', 'group-transportation',
  'vip-special-events',
]
const AREA_SLUGS = [
  'denver-metro', 'south-denver-metro', 'north-denver-metro', 'boulder-northern-colorado',
  'foothills-mountain-gateway', 'colorado-mountain-resorts', 'colorado-springs-southern',
  'airports-private-aviation', 'entertainment-sports-hotels', 'long-distance-interstate',
]

const POST_SLUGS = [
  'denver-airport-transportation-guide',
  'red-rocks-concert-transportation',
  'colorado-ski-resort-transfers',
]

const ROUTES = [
  '/', '/services', '/fleet', '/pricing', '/service-areas', '/reviews', '/blog',
  '/about', '/contact', '/book', '/quote',
  ...SERVICE_SLUGS.map((s) => `/services/${s}`),
  ...AREA_SLUGS.map((s) => `/service-areas/${s}`),
  ...POST_SLUGS.map((s) => `/blog/${s}`),
  '/admin',
]

const escHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const escAttr = (s) => escHtml(s).replace(/"/g, '&quot;')

function buildHtml(route) {
  const meta = getRouteMeta(route)
  const canonical = SITE + (route === '/' ? '/' : route)
  let html = template
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${escHtml(meta.title)}</title>`)
    // \s+ rather than a literal space: the tag is written across three lines in
    // index.html, so a single-space pattern silently matched nothing and every
    // page shipped the homepage's description.
    .replace(
      /(<meta\s+name="description"\s+content=)"[^"]*"/,
      `$1"${escAttr(meta.description)}"`
    )
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
    body = render(route, settings ?? undefined)
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

// ── sitemap.xml — generated from the live route list so it never goes stale ──
function sitemapEntry(route) {
  const loc = SITE + (route === '/' ? '/' : route)
  const priority =
    route === '/' ? '1.0'
    : route === '/book' || route === '/services' ? '0.9'
    : route.startsWith('/services/') || route.startsWith('/service-areas') || route === '/fleet' ? '0.8'
    : '0.7'
  const changefreq = route === '/' ? 'weekly' : 'monthly'
  return `  <url><loc>${loc}</loc><changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`
}
const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...ROUTES.filter((r) => r !== '/admin').map(sitemapEntry),
  '</urlset>',
  '',
].join('\n')
fs.writeFileSync(path.join(DIST, 'sitemap.xml'), sitemap)
console.log(`✔ Generated sitemap.xml (${ROUTES.length - 1} URLs).`)
