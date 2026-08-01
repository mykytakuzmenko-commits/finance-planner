import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type AnchorHTMLAttributes,
  type ReactNode,
} from 'react'

interface RouterContextValue {
  path: string
  navigate: (to: string) => void
}

const RouterContext = createContext<RouterContextValue | null>(null)

function currentPath(): string {
  return window.location.pathname || '/'
}

/**
 * Minimal dependency-free client router built on the History API.
 * The app is a small tab-style SPA, so this is all we need — no nested
 * routes, params or data loading. Vercel rewrites all paths to index.html.
 */
export function RouterProvider({ children }: { children: ReactNode }) {
  const [path, setPath] = useState<string>(() => currentPath())

  useEffect(() => {
    const onPop = () => setPath(currentPath())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const navigate = useCallback((to: string) => {
    if (to === currentPath()) return
    window.history.pushState({}, '', to)
    setPath(to)
    window.scrollTo(0, 0)
  }, [])

  const value = useMemo(() => ({ path, navigate }), [path, navigate])

  return (
    <RouterContext.Provider value={value}>{children}</RouterContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useRouter(): RouterContextValue {
  const ctx = useContext(RouterContext)
  if (!ctx) throw new Error('useRouter must be used within a RouterProvider')
  return ctx
}

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  to: string
  children: ReactNode
}

export function Link({ to, onClick, children, ...rest }: LinkProps) {
  const { navigate } = useRouter()
  return (
    <a
      href={to}
      onClick={(e) => {
        // Let modified clicks (open in new tab) behave normally.
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
        e.preventDefault()
        onClick?.(e)
        navigate(to)
      }}
      {...rest}
    >
      {children}
    </a>
  )
}
