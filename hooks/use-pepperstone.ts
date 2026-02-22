import { useState, useEffect, useCallback } from 'react'

export interface PepperstoneAccountSummary {
  login: string
  currency: string
  balance: number
  credit: number
  equity: number
  margin: number
  freeMargin: number
  marginLevel: number
  marginPercent: number
  orders: number
  positions: number
  buyingPower: number
}

export interface PepperstonePosition {
  ticket: string
  symbol: string
  type: 'BUY' | 'SELL'
  volume: number
  price: number
  profit: number
  profitPercent: number
  commission: number
  swap: number
  timeOpen: string
  timeUpdate: string
  comment: string
}

export interface PepperstoneTradeSummary {
  ticket: string
  symbol: string
  type: 'BUY' | 'SELL'
  status: 'OPEN' | 'CLOSED' | 'PENDING'
  volume: number
  openPrice: number
  openTime: string
  closePrice?: number
  closeTime?: string
  profit: number
  commission: number
  swap: number
  comment: string
}

export function usePepperstone() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [account, setAccount] = useState<PepperstoneAccountSummary | null>(null)
  const [positions, setPositions] = useState<PepperstonePosition[]>([])
  const [trades, setTrades] = useState<PepperstoneTradeSummary[]>([])
  const [lastSync, setLastSync] = useState<Date | null>(null)

  const sync = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/pepperstone/sync', { method: 'POST' })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sync Pepperstone data')
      }

      setLastSync(new Date())
      return data
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      console.error('Pepperstone sync error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchAccount = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/pepperstone/account')
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
      const response = await fetch('/api/pepperstone/positions')
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
      const response = await fetch(`/api/pepperstone/trades?state=${state}`)
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
