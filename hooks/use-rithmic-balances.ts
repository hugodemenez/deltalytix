"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { getAllRithmicData } from "@/lib/rithmic-storage"
import {
  fetchRithmicBalances,
  getRithmicApiBaseUrl,
  RithmicAccountBalance,
} from "@/lib/rithmic-api"

export interface RithmicBalancesState {
  balancesByAccountId: Record<string, RithmicAccountBalance>
  isLoading: boolean
  error: string | null
  rateLimited: boolean
  lastFetchedAt: Date | null
  hasCredentials: boolean
  refresh: () => Promise<void>
}

export function useRithmicBalances(): RithmicBalancesState {
  const [balancesByAccountId, setBalancesByAccountId] = useState<
    Record<string, RithmicAccountBalance>
  >({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rateLimited, setRateLimited] = useState(false)
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null)
  const [hasCredentials, setHasCredentials] = useState(false)
  const fetchIdRef = useRef(0)

  const refresh = useCallback(async () => {
    if (!getRithmicApiBaseUrl()) return

    const credentialSets = Object.values(getAllRithmicData())
    setHasCredentials(credentialSets.length > 0)
    if (credentialSets.length === 0) {
      setBalancesByAccountId({})
      setError(null)
      setRateLimited(false)
      return
    }

    const fetchId = ++fetchIdRef.current
    setIsLoading(true)
    setError(null)
    setRateLimited(false)

    const merged: Record<string, RithmicAccountBalance> = {}

    try {
      for (const credentialSet of credentialSets) {
        const result = await fetchRithmicBalances(credentialSet.credentials)

        if (fetchId !== fetchIdRef.current) return

        if (!result.success) {
          if (result.rateLimited) {
            setRateLimited(true)
            setError(result.message)
            break
          }
          setError(result.message)
          continue
        }

        for (const balance of result.balances) {
          merged[balance.account_id] = balance
        }
      }

      if (fetchId === fetchIdRef.current) {
        setBalancesByAccountId(merged)
        setLastFetchedAt(new Date())
      }
    } catch (err) {
      if (fetchId === fetchIdRef.current) {
        setError(err instanceof Error ? err.message : "Failed to fetch balances")
      }
    } finally {
      if (fetchId === fetchIdRef.current) {
        setIsLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return {
    balancesByAccountId,
    isLoading,
    error,
    rateLimited,
    lastFetchedAt,
    hasCredentials,
    refresh,
  }
}

export function isRithmicLinkedAccount(
  accountNumber: string,
  balancesByAccountId: Record<string, RithmicAccountBalance>
): boolean {
  return accountNumber in balancesByAccountId
}

export function getRithmicLinkedAccountNumbers(): Set<string> {
  const credentialSets = Object.values(getAllRithmicData())
  const numbers = new Set<string>()
  for (const credentialSet of credentialSets) {
    for (const accountId of credentialSet.selectedAccounts) {
      numbers.add(accountId)
    }
  }
  return numbers
}
