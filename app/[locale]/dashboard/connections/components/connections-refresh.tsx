'use client'

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { ConnectionService } from '../actions'

type RefreshFn = () => void

type ConnectionsRefreshContextValue = {
  refresh: () => void
  register: (fn: RefreshFn) => () => void
  /** Open the connect/reconnect sheet for a service (from chrome or a row). */
  connectService: ConnectionService | null
  openConnect: (service: ConnectionService) => void
  closeConnect: () => void
}

const ConnectionsRefreshContext =
  createContext<ConnectionsRefreshContextValue | null>(null)

/**
 * Lets the instant page chrome (header actions / import) ask the streamed
 * list to reload without remounting the Suspense boundary, and lets rows
 * open the shared ConnectServiceModal for reconnect.
 */
export function ConnectionsRefreshProvider({
  children,
}: {
  children: ReactNode
}) {
  const fnRef = useRef<RefreshFn | null>(null)
  const [connectService, setConnectService] =
    useState<ConnectionService | null>(null)

  const register = useCallback((fn: RefreshFn) => {
    fnRef.current = fn
    return () => {
      if (fnRef.current === fn) fnRef.current = null
    }
  }, [])

  const refresh = useCallback(() => {
    fnRef.current?.()
  }, [])

  const openConnect = useCallback((service: ConnectionService) => {
    setConnectService(service)
  }, [])

  const closeConnect = useCallback(() => {
    setConnectService(null)
  }, [])

  return (
    <ConnectionsRefreshContext.Provider
      value={{
        refresh,
        register,
        connectService,
        openConnect,
        closeConnect,
      }}
    >
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
