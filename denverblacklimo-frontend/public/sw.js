/**
 * Service worker for the Denver Black Limo admin app.
 *
 * The governing rule here is that this is an operations tool. A chauffeur
 * standing at the wrong terminal because the app showed a cached pick-up is a
 * worse outcome than the app being slow, so nothing from the API is ever
 * cached or served from cache. Not once, not briefly, not as a fallback.
 * Only the application shell — the HTML, JS, CSS and icons that make up the
 * program itself — is cached, because those are the same bytes whether they
 * come from the network or not.
 *
 * There is deliberately no precache manifest. The build prerenders HTML after
 * Vite runs, so any manifest generated during the bundle step would be wrong by
 * the time the build finished. Caching on demand needs no such list and cannot
 * drift out of step with what was actually deployed.
 *
 * BUILD_VERSION is replaced at build time by prerender.mjs. Changing it renames
 * the cache, which is what makes a deploy take effect rather than leaving
 * people on last week's bundle.
 */

const VERSION = '__BUILD_VERSION__';
const SHELL_CACHE = `dbl-admin-shell-${VERSION}`;

/** Fetched up front so the app opens on a cold start with no connection. */
const SHELL_URLS = ['/admin', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      // One bad URL must not fail the whole install, so they are added
      // individually and failures are tolerated.
      .then((cache) => Promise.allSettled(SHELL_URLS.map((u) => cache.add(u))))
      // The page decides when to apply an update; see SKIP_WAITING below.
      .then(() => undefined)
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names.filter((n) => n.startsWith('dbl-admin-') && n !== SHELL_CACHE).map((n) => caches.delete(n))
      );
      await self.clients.claim();
    })()
  );
});

/**
 * The page asks for the update rather than having it forced on it, so a half
 * finished booking is never thrown away by a deploy landing mid-edit.
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

/** Anything that is not the app itself: the API, and any other origin. */
function isLiveData(url) {
  return url.pathname.startsWith('/api/') || url.origin !== self.location.origin;
}

/** Hashed build output. The filename changes when the content does. */
function isImmutableAsset(url) {
  return url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/');
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Live data and cross-origin requests are left entirely alone — not
  // intercepted, not cached, not given a stale fallback. An admin who is
  // offline must see the request fail, not yesterday's answer.
  if (isLiveData(url)) return;

  // Hashed assets can be served from cache without a second thought: a new
  // build produces new filenames, so a cache hit is always correct.
  if (isImmutableAsset(url)) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(SHELL_CACHE).then((c) => c.put(request, copy));
            }
            return res;
          })
      )
    );
    return;
  }

  // Navigations and everything else in the shell: network first, so a deploy is
  // picked up immediately, falling back to cache only when the network fails.
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(SHELL_CACHE).then((c) => c.put('/admin', copy));
          }
          return res;
        })
        .catch(async () => (await caches.match('/admin')) || Response.error())
    );
    return;
  }

  event.respondWith(
    fetch(request).catch(async () => (await caches.match(request)) || Response.error())
  );
});
