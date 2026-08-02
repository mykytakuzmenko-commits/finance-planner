import { useEffect, useState } from 'react'

/** Slim banner shown while the browser reports no network connection. */
export function OfflineBanner() {
  const [offline, setOffline] = useState(
    () => typeof navigator !== 'undefined' && !navigator.onLine,
  )

  useEffect(() => {
    const online = () => setOffline(false)
    const goneOffline = () => setOffline(true)
    window.addEventListener('online', online)
    window.addEventListener('offline', goneOffline)
    return () => {
      window.removeEventListener('online', online)
      window.removeEventListener('offline', goneOffline)
    }
  }, [])

  if (!offline) return null
  return (
    <div className="offline-banner" role="status">
      Ви офлайн — показано останні збережені дані. Зміни будуть доступні, коли зʼявиться мережа.
    </div>
  )
}
