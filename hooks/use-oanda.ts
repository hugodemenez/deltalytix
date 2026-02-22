import { useState, useEffect, useCallback } from 'react'

export interface OANDAAccountSummary {
  id: string
  alias: string
  currency: string
  balance: number
  unrealizedPL: number
  marginUsed: number
  marginAvailable: number
  openTradeCount: number
  openPositionCount: number
}

export interface OANDAPosition {
  instrument: string
  netUnits: number
  longUnits: number
  longAveragePrice: number
  longRealizedPL: number
  longUnrealizedPL: number
  shortUnits: number
  shortAveragePrice: number
  shortRealizedPL: number
  shortUnrealizedPL: number
  totalRealizedPL: number
  totalUnrealizedPL: number
}

export interface OANDATradeSummary {
  id: string
  instrument: string
  state: 'OPEN' | 'CLOSED'
  units: number
  openTime: string
  averagePrice: number
  realizedPL: number
  unrealizedPL: number
  closeTime?: string
}

export function useOANDA() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [account, setAccount] = useState<OANDAAccountSummary | null>(null)
  const [positions, setPositions] = useState<OANDAPosition[]>([])
  const [trades, setTrades] = useState<OANDATradeSummary[]>([])
  const [lastSync, setLastSync] = useState<Date | null>(null)

  const sync = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/oanda/sync', { method: 'POST' })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sync OANDA data')
      }

      setLastSync(new Date())
      return data
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      console.error('OANDA sync error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchAccount = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/oanda/account')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch account')
      }

      setAccount(data.account)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchPositions = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/oanda/positions')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch positions')
      }

      setPositions(data.positions)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchTrades = useCallback(async (state: 'open' | 'closed' | 'all' = 'all') => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/oanda/trades?state=${state}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch trades')
      }

      setTrades(data.trades)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    account,
    positions,
    trades,
    loading,
    error,
    lastSync,
    sync,
    fetchAccount,
    fetchPositions,
    fetchTrades,
  }
}
