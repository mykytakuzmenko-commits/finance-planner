/** Register the app-shell service worker in production builds only.
 * In dev we skip it so Vite's HMR is never served from cache. */
export function registerServiceWorker() {
  if (!import.meta.env.PROD) return
  if (!('serviceWorker' in navigator)) return
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* offline support is best-effort; ignore registration failures */
    })
  })
}
