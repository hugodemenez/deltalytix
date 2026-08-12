"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { getRithmicProtocolBalancesAction } from "@/app/[locale]/dashboard/components/import/rithmic-protocol/sync/actions"
import {
  getAllRithmicData,
  getLinkedRithmicAccountNumbers,
  hasAnyRithmicAllAccountsMode,
  RITHMIC_STORAGE_UPDATED_EVENT,
} from "@/lib/rithmic-storage"
import {
  fetchRithmicBalances,
  findRithmicBalanceForAccount,
  getPrimaryRithmicBalance,
  getRithmicApiBaseUrl,
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
  source?: "classic" | "protocol"
}

export interface RithmicBalancesDebugInfo {
  generatedAt: string
  apiHost: string | undefined
  apiBaseUrl: string | null
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
  protocolHasConnections?: boolean
  protocolErrors?: string[]
}

export interface RithmicBalancesState {
  balancesByAccountId: Record<string, RithmicAccountBalance>
  isLoading: boolean
  error: string | null
  rateLimited: boolean
  lastFetchedAt: Date | null
  hasCredentials: boolean
  /** True when any credential set uses "sync all accounts" (legacy empty selectedAccounts). */
  syncsAllAccounts: boolean
  debug: RithmicBalancesDebugInfo
  refresh: (options?: { force?: boolean }) => Promise<void>
}

export interface UseRithmicBalancesOptions {
  /**
   * Whether to ask the server for Protocol balances. Each server fetch opens a
   * WebSocket to the Rithmic gateway, so callers pass false until they know the
   * user actually has a Protocol-linked account.
   */
  protocolEnabled?: boolean
}

function readCredentialSnapshot() {
  const credentialSets = Object.values(getAllRithmicData())
  return {
    credentialSets,
    hasCredentials: credentialSets.length > 0,
    syncsAllAccounts: hasAnyRithmicAllAccountsMode(credentialSets),
    linkedAccountNumbers: getLinkedRithmicAccountNumbers(credentialSets),
  }
}

function resolveLinkedAccountNumbers(
  selectedLinked: string[],
  balancesByAccountId: Record<string, RithmicAccountBalance>,
  syncsAllAccounts: boolean
): string[] {
  const linked = new Set(selectedLinked)
  // Legacy "all accounts" saves left selectedAccounts empty — treat fetched
  // balance account IDs as linked so Solde Rithmic still renders on those rows.
  if (syncsAllAccounts || selectedLinked.length === 0) {
    for (const accountId of Object.keys(balancesByAccountId)) {
      linked.add(accountId)
    }
  }
  return [...linked]
}

function buildDebugSnapshot(
  overrides: Omit<Partial<RithmicBalancesDebugInfo>, "lastFetchedAt"> & {
    balancesByAccountId: Record<string, RithmicAccountBalance>
    isLoading: boolean
    error: string | null
    rateLimited: boolean
    lastFetchedAt: Date | null
    extraLinkedAccountNumbers?: string[]
  }
): RithmicBalancesDebugInfo {
  const { credentialSets, linkedAccountNumbers, syncsAllAccounts } =
    readCredentialSnapshot()
  const { lastFetchedAt, extraLinkedAccountNumbers = [], ...rest } = overrides
  const resolvedLinked = resolveLinkedAccountNumbers(
    [...linkedAccountNumbers, ...extraLinkedAccountNumbers],
    overrides.balancesByAccountId,
    syncsAllAccounts
  )

  return {
    generatedAt: new Date().toISOString(),
    apiHost: process.env.NEXT_PUBLIC_RITHMIC_API_URL,
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
    fetchAttempts: [],
    balanceCount: Object.keys(overrides.balancesByAccountId).length,
    ...rest,
    linkedAccountNumbers: resolvedLinked,
    lastFetchedAt: lastFetchedAt?.toISOString() ?? null,
  }
}

export function useRithmicBalances(
  options: UseRithmicBalancesOptions = {}
): RithmicBalancesState {
  const { protocolEnabled = true } = options
  const [initialSnapshot] = useState(readCredentialSnapshot)
  const [balancesByAccountId, setBalancesByAccountId] = useState<
    Record<string, RithmicAccountBalance>
  >({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rateLimited, setRateLimited] = useState(false)
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null)
  const [hasCredentials, setHasCredentials] = useState(
    initialSnapshot.hasCredentials
  )
  const [syncsAllAccounts, setSyncsAllAccounts] = useState(
    initialSnapshot.syncsAllAccounts
  )
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
  const protocolEnabledRef = useRef(protocolEnabled)

  useEffect(() => {
    balancesRef.current = balancesByAccountId
    lastFetchedAtRef.current = lastFetchedAt
  }, [balancesByAccountId, lastFetchedAt])

  useEffect(() => {
    protocolEnabledRef.current = protocolEnabled
  }, [protocolEnabled])

  const refresh = useCallback(async (refreshOptions: { force?: boolean } = {}) => {
    abortControllerRef.current?.abort()
    const abortController = new AbortController()
    abortControllerRef.current = abortController

    const apiBaseUrl = getRithmicApiBaseUrl()
    const {
      credentialSets,
      hasCredentials: hasClassicCredentials,
      syncsAllAccounts: nextSyncsAll,
    } = readCredentialSnapshot()
    setSyncsAllAccounts(nextSyncsAll)

    const fetchId = ++fetchIdRef.current
    setIsLoading(true)
    setError(null)
    setRateLimited(false)

    const merged: Record<string, RithmicAccountBalance> = {}
    const fetchAttempts: RithmicBalanceFetchAttempt[] = []
    const protocolLinked: string[] = []
    let latestError: string | null = null
    let latestRateLimited = false
    let protocolHasConnections = false
    let protocolErrors: string[] = []
    let anySucceeded = false

    try {
      // 1) Protocol PnL plant (preferred — stored server-side credentials).
      // Skipped entirely unless the caller knows the user has a Protocol
      // account: each server fetch can open a gateway WebSocket.
      try {
        const protocolResult = protocolEnabledRef.current
          ? await getRithmicProtocolBalancesAction({
              force: refreshOptions.force === true,
            })
          : null
        if (abortController.signal.aborted || fetchId !== fetchIdRef.current) {
          return
        }

        if (protocolResult === null) {
          fetchAttempts.push({
            credentialId: "rithmic-protocol",
            username: "protocol",
            server_type: "rithmic-protocol",
            location: "server",
            success: true,
            message: "Skipped — no Protocol-linked account",
            source: "protocol",
          })
        } else if (protocolResult.success) {
          protocolHasConnections = protocolResult.hasConnections
          protocolErrors = protocolResult.errors
          protocolLinked.push(...protocolResult.linkedAccountNumbers)

          fetchAttempts.push({
            credentialId: "rithmic-protocol",
            username: "protocol",
            server_type: "rithmic-protocol",
            location: "server",
            success: protocolResult.errors.length === 0 || protocolResult.balances.length > 0,
            balanceCount: protocolResult.balances.length,
            accountIds: protocolResult.linkedAccountNumbers,
            message:
              protocolResult.errors.length > 0
                ? protocolResult.errors.join("; ")
                : protocolResult.hasConnections
                  ? undefined
                  : "No Protocol connections",
            source: "protocol",
          })

          if (protocolResult.balances.length > 0) {
            anySucceeded = true
            for (const balance of protocolResult.balances) {
              const normalized = normalizeRithmicAccountBalance(balance)
              if (!normalized) continue
              merged[normalized.account_id] = normalized
            }
          } else if (protocolResult.errors.length > 0) {
            latestError = protocolResult.errors.join("; ")
          }
        } else {
          latestError = protocolResult.error
          fetchAttempts.push({
            credentialId: "rithmic-protocol",
            username: "protocol",
            server_type: "rithmic-protocol",
            location: "server",
            success: false,
            message: protocolResult.error,
            source: "protocol",
          })
        }
      } catch (err) {
        if (abortController.signal.aborted) return
        latestError =
          err instanceof Error ? err.message : "Protocol balance fetch failed"
        fetchAttempts.push({
          credentialId: "rithmic-protocol",
          username: "protocol",
          server_type: "rithmic-protocol",
          location: "server",
          success: false,
          message: latestError,
          source: "protocol",
        })
      }

      // 2) Classic R | API+ /balances (browser localStorage credentials)
      if (credentialSets.length > 0 && apiBaseUrl) {
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
            source: "classic",
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
          anySucceeded = true

          for (const balance of result.balances) {
            const normalized = normalizeRithmicAccountBalance(balance)
            if (!normalized) continue
            // Protocol values win when both paths return the same account.
            if (!(normalized.account_id in merged)) {
              merged[normalized.account_id] = normalized
            }
          }
        }
      } else if (credentialSets.length > 0 && !apiBaseUrl) {
        fetchAttempts.push({
          credentialId: "classic",
          username: "classic",
          server_type: "classic",
          location: "local",
          success: false,
          message: "NEXT_PUBLIC_RITHMIC_API_URL is missing",
          source: "classic",
        })
      }

      if (fetchId !== fetchIdRef.current) return

      const hasAnySource = hasClassicCredentials || protocolHasConnections
      setHasCredentials(hasAnySource)

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
          extraLinkedAccountNumbers: protocolLinked,
          protocolHasConnections,
          protocolErrors,
          skippedReason:
            !hasAnySource
              ? "No Rithmic Protocol connections or classic credentials"
              : undefined,
        })
      )
    } catch (err) {
      if (abortController.signal.aborted) return
      if (fetchId === fetchIdRef.current) {
        const message =
          err instanceof Error ? err.message : "Failed to fetch balances"
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
            extraLinkedAccountNumbers: protocolLinked,
            protocolHasConnections,
            protocolErrors,
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

  // Re-runs when protocolEnabled flips: callers start false while accounts are
  // still loading, so the Protocol pass has to happen once they are known.
  useEffect(() => {
    void refresh()
  }, [refresh, protocolEnabled])

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
    syncsAllAccounts,
    debug,
    refresh,
  }
}

export function isRithmicLinkedAccount(
  accountNumber: string,
  balancesByAccountId: Record<string, RithmicAccountBalance>,
  linkedAccountNumbers?: Set<string> | string[]
): boolean {
  if (findRithmicBalanceForAccount(accountNumber, balancesByAccountId)) {
    return true
  }
  if (!linkedAccountNumbers) return false
  const linkedSet =
    linkedAccountNumbers instanceof Set
      ? linkedAccountNumbers
      : new Set(linkedAccountNumbers)
  return linkedSet.has(accountNumber)
}

export function buildRithmicBalancesDebugReport(
  debug: RithmicBalancesDebugInfo,
  dashboardAccountNumbers: string[]
): string {
  try {
    const linkedSet = new Set(debug.linkedAccountNumbers ?? [])
    const dashboardSet = new Set(dashboardAccountNumbers)
    const syncsAllAccounts = (debug.credentialSets ?? []).some(
      (set) => set.allAccounts
    )

    const accountDiagnostics = dashboardAccountNumbers.map((accountNumber) => {
      const inLinked = linkedSet.has(accountNumber)
      const balanceEntry = findRithmicBalanceForAccount(
        accountNumber,
        debug.balancesByAccountId ?? {}
      )
      const inBalances = balanceEntry != null
      const primaryBalance = balanceEntry
        ? getPrimaryRithmicBalance(balanceEntry)
        : null

      return {
        accountNumber,
        inLinkedAccounts: inLinked,
        inFetchedBalances: inBalances,
        showRithmicBalance: inLinked || inBalances || syncsAllAccounts,
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
