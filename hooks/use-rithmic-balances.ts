"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { getAllRithmicData, RITHMIC_STORAGE_UPDATED_EVENT } from "@/lib/rithmic-storage"
import {
  fetchRithmicBalances,
  getPrimaryRithmicBalance,
  getRithmicApiBaseUrl,
  getRithmicApiHost,
  normalizeRithmicAccountBalance,
  RithmicAccountBalance,
} from "@/lib/rithmic-api"

export interface RithmicBalanceFetchAttempt {
  credentialId: string
  username: string
  server_type: string
  location: string
  success: boolean
  rateLimited?: boolean
  httpStatus?: number
  message?: string
  balanceCount?: number
  accountIds?: string[]
  rateLimitInfo?: {
    remaining_attempts: number
    minutes_until_reset: number
  }
}

export interface RithmicBalancesDebugInfo {
  generatedAt: string
  apiHost: string | undefined
  apiBaseUrl: string
  credentialSetCount: number
  credentialSets: Array<{
    id: string
    username: string
    server_type: string
    location: string
    selectedAccounts: string[]
    allAccounts?: boolean
  }>
  linkedAccountNumbers: string[]
  fetchAttempts: RithmicBalanceFetchAttempt[]
  balancesByAccountId: Record<string, RithmicAccountBalance>
  balanceCount: number
  isLoading: boolean
  error: string | null
  rateLimited: boolean
  lastFetchedAt: string | null
  skippedReason?: string
}

export interface RithmicBalancesState {
  balancesByAccountId: Record<string, RithmicAccountBalance>
  isLoading: boolean
  error: string | null
  rateLimited: boolean
  lastFetchedAt: Date | null
  hasCredentials: boolean
  debug: RithmicBalancesDebugInfo
  refresh: () => Promise<void>
}

function buildDebugSnapshot(
  overrides: Omit<Partial<RithmicBalancesDebugInfo>, "lastFetchedAt"> & {
    balancesByAccountId: Record<string, RithmicAccountBalance>
    isLoading: boolean
    error: string | null
    rateLimited: boolean
    lastFetchedAt: Date | null
  }
): RithmicBalancesDebugInfo {
  const credentialSets = Object.values(getAllRithmicData())
  const linkedAccountNumbers = credentialSets.flatMap((set) => set.selectedAccounts)
  const { lastFetchedAt, ...rest } = overrides

  return {
    generatedAt: new Date().toISOString(),
    apiHost: getRithmicApiHost(),
    apiBaseUrl: getRithmicApiBaseUrl(),
    credentialSetCount: credentialSets.length,
    credentialSets: credentialSets.map((set) => ({
      id: set.id,
      username: set.credentials.username,
      server_type: set.credentials.server_type,
      location: set.credentials.location,
      selectedAccounts: set.selectedAccounts,
      allAccounts: set.allAccounts,
    })),
    linkedAccountNumbers,
    fetchAttempts: [],
    balanceCount: Object.keys(overrides.balancesByAccountId).length,
    ...rest,
    lastFetchedAt: lastFetchedAt?.toISOString() ?? null,
  }
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
  const [debug, setDebug] = useState<RithmicBalancesDebugInfo>(() =>
    buildDebugSnapshot({
      balancesByAccountId: {},
      isLoading: false,
      error: null,
      rateLimited: false,
      lastFetchedAt: null,
    })
  )
  const fetchIdRef = useRef(0)
  const abortControllerRef = useRef<AbortController | null>(null)
  const balancesRef = useRef(balancesByAccountId)
  const lastFetchedAtRef = useRef(lastFetchedAt)

  useEffect(() => {
    balancesRef.current = balancesByAccountId
    lastFetchedAtRef.current = lastFetchedAt
  }, [balancesByAccountId, lastFetchedAt])

  const refresh = useCallback(async () => {
    abortControllerRef.current?.abort()
    const abortController = new AbortController()
    abortControllerRef.current = abortController

    const credentialSets = Object.values(getAllRithmicData())
    setHasCredentials(credentialSets.length > 0)

    if (credentialSets.length === 0) {
      setBalancesByAccountId({})
      setError(null)
      setRateLimited(false)
      setDebug(
        buildDebugSnapshot({
          balancesByAccountId: {},
          isLoading: false,
          error: null,
          rateLimited: false,
          lastFetchedAt: null,
          skippedReason: "No Rithmic credentials in localStorage",
          fetchAttempts: [],
        })
      )
      return
    }

    const fetchId = ++fetchIdRef.current
    setIsLoading(true)
    setError(null)
    setRateLimited(false)

    const merged: Record<string, RithmicAccountBalance> = {}
    const fetchAttempts: RithmicBalanceFetchAttempt[] = []
    let latestError: string | null = null
    let latestRateLimited = false

    try {
      for (const credentialSet of credentialSets) {
        if (abortController.signal.aborted) return

        const result = await fetchRithmicBalances(credentialSet.credentials, {
          signal: abortController.signal,
        })

        if (fetchId !== fetchIdRef.current) return

        const attempt: RithmicBalanceFetchAttempt = {
          credentialId: credentialSet.id,
          username: credentialSet.credentials.username,
          server_type: credentialSet.credentials.server_type,
          location: credentialSet.credentials.location,
          success: result.success,
          httpStatus: result.httpStatus,
          message: result.success ? result.message : result.message,
        }

        if (!result.success) {
          attempt.rateLimited = result.rateLimited
          latestError = result.message
          if (result.rateLimited) {
            latestRateLimited = true
            fetchAttempts.push(attempt)
            break
          }
          fetchAttempts.push(attempt)
          continue
        }

        attempt.balanceCount = result.balances.length
        attempt.accountIds = result.balances.map((balance) => balance.account_id)
        attempt.rateLimitInfo = result.rateLimitInfo
        fetchAttempts.push(attempt)

        for (const balance of result.balances) {
          const normalized = normalizeRithmicAccountBalance(balance)
          if (!normalized) continue
          merged[normalized.account_id] = normalized
        }
      }

      if (fetchId === fetchIdRef.current) {
        const anySucceeded = fetchAttempts.some((attempt) => attempt.success)
        const balancesToShow = anySucceeded ? merged : balancesRef.current
        const fetchedAt = anySucceeded ? new Date() : lastFetchedAtRef.current
        setBalancesByAccountId(balancesToShow)
        if (anySucceeded) {
          setLastFetchedAt(fetchedAt)
        }
        setError(latestError)
        setRateLimited(latestRateLimited)
        setDebug(
          buildDebugSnapshot({
            balancesByAccountId: balancesToShow,
            isLoading: false,
            error: latestError,
            rateLimited: latestRateLimited,
            lastFetchedAt: fetchedAt,
            fetchAttempts,
          })
        )
      }
    } catch (err) {
      if (abortController.signal.aborted) return
      if (fetchId === fetchIdRef.current) {
        const message =
          err instanceof Error ? err.message : "Failed to fetch balances"
        const anySucceeded = fetchAttempts.some((attempt) => attempt.success)
        const balancesToShow = anySucceeded ? merged : balancesRef.current
        const fetchedAt = anySucceeded ? new Date() : lastFetchedAtRef.current
        setBalancesByAccountId(balancesToShow)
        if (anySucceeded) {
          setLastFetchedAt(fetchedAt)
        }
        setError(message)
        setDebug(
          buildDebugSnapshot({
            balancesByAccountId: balancesToShow,
            isLoading: false,
            error: message,
            rateLimited: latestRateLimited,
            lastFetchedAt: fetchedAt,
            fetchAttempts,
            skippedReason: "Unexpected error during fetch",
          })
        )
      }
    } finally {
      if (fetchId === fetchIdRef.current) {
        setIsLoading(false)
      }
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    const handleStorageUpdate = () => {
      void refresh()
    }

    window.addEventListener(RITHMIC_STORAGE_UPDATED_EVENT, handleStorageUpdate)
    return () => {
      window.removeEventListener(RITHMIC_STORAGE_UPDATED_EVENT, handleStorageUpdate)
      abortControllerRef.current?.abort()
    }
  }, [refresh])

  return {
    balancesByAccountId,
    isLoading,
    error,
    rateLimited,
    lastFetchedAt,
    hasCredentials,
    debug,
    refresh,
  }
}

export function isRithmicLinkedAccount(
  accountNumber: string,
  balancesByAccountId: Record<string, RithmicAccountBalance>
): boolean {
  return accountNumber in balancesByAccountId
}

export function buildRithmicBalancesDebugReport(
  debug: RithmicBalancesDebugInfo,
  dashboardAccountNumbers: string[]
): string {
  try {
    const linkedSet = new Set(debug.linkedAccountNumbers ?? [])
    const balanceIds = new Set(Object.keys(debug.balancesByAccountId ?? {}))
    const dashboardSet = new Set(dashboardAccountNumbers)

    const accountDiagnostics = dashboardAccountNumbers.map((accountNumber) => {
      const inLinked = linkedSet.has(accountNumber)
      const inBalances = balanceIds.has(accountNumber)
      const balanceEntry = debug.balancesByAccountId?.[accountNumber]
      const primaryBalance = balanceEntry
        ? getPrimaryRithmicBalance(balanceEntry)
        : null

      return {
        accountNumber,
        inLinkedAccounts: inLinked,
        inFetchedBalances: inBalances,
        showRithmicBalance: inLinked || inBalances,
        primaryBalance,
        rawBalance: balanceEntry ?? null,
      }
    })

    const unmatchedLinked = (debug.linkedAccountNumbers ?? []).filter(
      (id) => !dashboardSet.has(id)
    )
    const fetchedNotInDashboard = Object.keys(debug.balancesByAccountId ?? {}).filter(
      (id) => !dashboardSet.has(id)
    )

    return JSON.stringify(
      {
        ...debug,
        dashboardAccountNumbers,
        accountDiagnostics,
        unmatchedLinked,
        fetchedNotInDashboard,
      },
      null,
      2
    )
  } catch (error) {
    return JSON.stringify(
      {
        error: "Failed to build debug report",
        message: error instanceof Error ? error.message : String(error),
        debug,
        dashboardAccountNumbers,
      },
      null,
      2
    )
  }
}

export function formatRithmicBalanceAmount(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—"
  return `$${value.toFixed(2)}`
}
