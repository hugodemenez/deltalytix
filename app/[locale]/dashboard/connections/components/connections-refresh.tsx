'use client'

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  type ReactNode,
} from 'react'

type RefreshFn = () => void

type ConnectionsRefreshContextValue = {
  refresh: () => void
  register: (fn: RefreshFn) => () => void
}

const ConnectionsRefreshContext =
  createContext<ConnectionsRefreshContextValue | null>(null)

/**
 * Lets the instant page chrome (header actions / import) ask the streamed
 * list to reload without remounting the Suspense boundary.
 */
export function ConnectionsRefreshProvider({
  children,
}: {
  children: ReactNode
}) {
  const fnRef = useRef<RefreshFn | null>(null)

  const register = useCallback((fn: RefreshFn) => {
    fnRef.current = fn
    return () => {
      if (fnRef.current === fn) fnRef.current = null
    }
  }, [])

  const refresh = useCallback(() => {
    fnRef.current?.()
  }, [])

  return (
    <ConnectionsRefreshContext.Provider value={{ refresh, register }}>
      {children}
    </ConnectionsRefreshContext.Provider>
  )
}

export function useConnectionsRefresh() {
  const ctx = useContext(ConnectionsRefreshContext)
  if (!ctx) {
    throw new Error(
      'useConnectionsRefresh must be used within ConnectionsRefreshProvider'
    )
  }
  return ctx
}
