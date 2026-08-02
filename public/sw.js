/* Finance Planner service worker — app-shell offline + installability.
 * Scope: same-origin only. Cross-origin requests (Supabase API, NBU rates)
 * always go straight to the network so live data is never served stale. */
const CACHE = 'fp-shell-v1'
const APP_SHELL = '/'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.add(APP_SHELL)).catch(() => {}),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  // Only handle our own origin; let Supabase / API calls pass through untouched.
  if (url.origin !== self.location.origin) return

  // Navigations: network-first, fall back to cached app shell when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put(APP_SHELL, copy)).catch(() => {})
          return res
        })
        .catch(() => caches.match(APP_SHELL).then((r) => r ?? Response.error())),
    )
    return
  }

  // Static assets (hashed, immutable): stale-while-revalidate.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone()
            caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {})
          }
          return res
        })
        .catch(() => cached)
      return cached ?? network
    }),
  )
})
