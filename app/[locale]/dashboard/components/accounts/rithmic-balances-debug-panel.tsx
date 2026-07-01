"use client"

import { Component, useCallback, useMemo, useState } from "react"
import { Bug, Copy, Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useI18n } from "@/locales/client"
import { Account } from "@/context/data-provider"
import {
  buildRithmicBalancesDebugReport,
  formatRithmicBalanceAmount,
  RithmicBalancesDebugInfo,
} from "@/hooks/use-rithmic-balances"
import {
  formatRithmicApiErrorMessage,
  getPrimaryRithmicBalance,
} from "@/lib/rithmic-api"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface RithmicBalancesDebugPanelProps {
  debug: RithmicBalancesDebugInfo
  accounts: Account[]
  isLoading: boolean
  onRefresh: () => Promise<void>
  className?: string
}

function StatusBadge({
  ok,
  label,
}: {
  ok: boolean
  label: string
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded px-2 py-0.5 text-xs font-medium",
        ok
          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
          : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
      )}
    >
      {label}
    </span>
  )
}

class DebugPanelErrorBoundary extends Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm">
          <p className="font-medium text-destructive">Debug panel crashed</p>
          <pre className="mt-2 overflow-auto whitespace-pre-wrap text-xs">
            {this.state.error.message}
          </pre>
        </div>
      )
    }

    return this.props.children
  }
}

function RithmicBalancesDebugBody({
  debug,
  accounts,
  isLoading,
  onRefresh,
}: {
  debug: RithmicBalancesDebugInfo
  accounts: Account[]
  isLoading: boolean
  onRefresh: () => Promise<void>
}) {
  const t = useI18n()

  const dashboardAccountNumbers = useMemo(
    () => accounts.map((account) => account.number).filter(Boolean) as string[],
    [accounts]
  )

  const report = useMemo(() => {
    try {
      return buildRithmicBalancesDebugReport(debug, dashboardAccountNumbers)
    } catch (error) {
      return JSON.stringify(
        {
          error: "Failed to build debug report",
          message: error instanceof Error ? error.message : String(error),
        },
        null,
        2
      )
    }
  }, [debug, dashboardAccountNumbers])

  const accountRows = useMemo(() => {
    const linkedSet = new Set(debug.linkedAccountNumbers ?? [])
    const balancesByAccountId = debug.balancesByAccountId ?? {}

    return accounts.map((account) => {
      const accountNumber = account.number ?? ""
      const balanceEntry = balancesByAccountId[accountNumber]
      const primaryBalance = balanceEntry
        ? getPrimaryRithmicBalance(balanceEntry)
        : null

      return {
        key: account.id || accountNumber || account.propfirm || "unknown-account",
        accountNumber,
        propfirm: account.propfirm ?? "",
        linked: linkedSet.has(accountNumber),
        fetched: Boolean(balanceEntry),
        show: linkedSet.has(accountNumber) || Boolean(balanceEntry),
        balance: primaryBalance,
      }
    })
  }, [accounts, debug.balancesByAccountId, debug.linkedAccountNumbers])

  const fetchAttempts = debug.fetchAttempts ?? []

  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(report)
      toast.success(t("rithmic.balances.debug.copied"))
    } catch {
      toast.error(t("rithmic.balances.debug.copyFailed"))
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-2 border-b px-4 pb-4">
        <Button
          size="sm"
          variant="outline"
          onClick={() => void onRefresh()}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          {t("rithmic.balances.refresh")}
        </Button>
        <Button size="sm" onClick={() => void copyReport()}>
          <Copy className="mr-2 h-4 w-4" />
          {t("rithmic.balances.debug.copy")}
        </Button>
      </div>

      <div className="max-h-[70vh] space-y-4 overflow-y-auto p-4 text-sm">
        <section className="space-y-2">
          <h3 className="font-medium">{t("rithmic.balances.debug.config")}</h3>
          <div className="space-y-1 rounded-md border p-3 font-mono text-xs">
            <div>
              <span className="text-muted-foreground">apiHost:</span>{" "}
              {debug.apiHost ?? "(missing)"}
            </div>
            <div>
              <span className="text-muted-foreground">apiBaseUrl:</span>{" "}
              {debug.apiBaseUrl ?? "(missing)"}
            </div>
            <div>
              <span className="text-muted-foreground">credentialSets:</span>{" "}
              {debug.credentialSetCount}
            </div>
            <div>
              <span className="text-muted-foreground">balances fetched:</span>{" "}
              {debug.balanceCount}
            </div>
            <div>
              <span className="text-muted-foreground">lastFetchedAt:</span>{" "}
              {debug.lastFetchedAt ?? "never"}
            </div>
            {debug.skippedReason && (
              <div className="text-amber-700 dark:text-amber-300">
                skipped: {debug.skippedReason}
              </div>
            )}
            {debug.error && (
              <div className="text-destructive">
                error: {formatRithmicApiErrorMessage(debug.error)}
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge
              ok={Boolean(debug.apiBaseUrl)}
              label={
                debug.apiBaseUrl
                  ? t("rithmic.balances.debug.apiConfigured")
                  : t("rithmic.balances.debug.apiMissing")
              }
            />
            <StatusBadge
              ok={debug.credentialSetCount > 0}
              label={
                debug.credentialSetCount > 0
                  ? t("rithmic.balances.debug.credentialsFound")
                  : t("rithmic.balances.debug.credentialsMissing")
              }
            />
            <StatusBadge
              ok={debug.balanceCount > 0}
              label={
                debug.balanceCount > 0
                  ? t("rithmic.balances.debug.balancesFound")
                  : t("rithmic.balances.debug.balancesMissing")
              }
            />
          </div>
        </section>

        <section className="space-y-2">
          <h3 className="font-medium">{t("rithmic.balances.debug.fetchAttempts")}</h3>
          {fetchAttempts.length === 0 ? (
            <p className="text-muted-foreground text-xs">
              {t("rithmic.balances.debug.noAttempts")}
            </p>
          ) : (
            <div className="space-y-2">
              {fetchAttempts.map((attempt, index) => (
                <div
                  key={`${attempt.credentialId}-${attempt.username}-${index}`}
                  className="rounded-md border p-3 font-mono text-xs"
                >
                  <div className="font-medium">{attempt.username}</div>
                  <div className="text-muted-foreground">
                    {attempt.server_type} · {attempt.location}
                  </div>
                  <div>
                    status: {attempt.httpStatus ?? "?"} · success:{" "}
                    {String(attempt.success)}
                  </div>
                  {attempt.message && (
                    <div>
                      message: {formatRithmicApiErrorMessage(attempt.message)}
                    </div>
                  )}
                  {attempt.balanceCount != null && (
                    <div>balances: {attempt.balanceCount}</div>
                  )}
                  {attempt.accountIds && attempt.accountIds.length > 0 && (
                    <div>accountIds: {attempt.accountIds.join(", ")}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-2">
          <h3 className="font-medium">{t("rithmic.balances.debug.accounts")}</h3>
          {accountRows.length === 0 ? (
            <p className="text-muted-foreground text-xs">
              {t("rithmic.balances.debug.noDashboardAccounts")}
            </p>
          ) : (
            <div className="space-y-2">
              {accountRows.map((row) => (
                <div key={row.key} className="rounded-md border p-3 text-xs">
                  <div className="font-medium">{row.accountNumber || "(no number)"}</div>
                  {row.propfirm && (
                    <div className="text-muted-foreground">{row.propfirm}</div>
                  )}
                  <div className="mt-1 flex flex-wrap gap-2">
                    <StatusBadge
                      ok={row.linked}
                      label={t("rithmic.balances.debug.linked")}
                    />
                    <StatusBadge
                      ok={row.fetched}
                      label={t("rithmic.balances.debug.fetched")}
                    />
                    <StatusBadge
                      ok={row.show}
                      label={t("rithmic.balances.debug.visible")}
                    />
                  </div>
                  <div className="mt-1 font-mono">
                    balance: {formatRithmicBalanceAmount(row.balance)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-2">
          <h3 className="font-medium">{t("rithmic.balances.debug.rawReport")}</h3>
          <pre className="max-h-64 overflow-auto rounded-md border bg-muted/30 p-3 text-[11px] leading-relaxed whitespace-pre-wrap break-all">
            {report}
          </pre>
        </section>
      </div>
    </>
  )
}

export function RithmicBalancesDebugPanel({
  debug,
  accounts,
  isLoading,
  onRefresh,
  className,
}: RithmicBalancesDebugPanelProps) {
  const t = useI18n()
  const [open, setOpen] = useState(false)

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen)
      if (nextOpen) {
        void onRefresh()
      }
    },
    [onRefresh]
  )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={className}
          title={t("rithmic.balances.debug.title")}
        >
          <Bug className="h-3.5 w-3.5" />
          <span className="ml-1.5">{t("rithmic.balances.debug.button")}</span>
        </Button>
      </DialogTrigger>
      {open ? (
        <DialogContent className="flex max-h-[90vh] w-[calc(100vw-1rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b p-4 pb-3">
            <DialogTitle>{t("rithmic.balances.debug.title")}</DialogTitle>
            <DialogDescription>
              {t("rithmic.balances.debug.description")}
            </DialogDescription>
          </DialogHeader>
          <DebugPanelErrorBoundary>
            <RithmicBalancesDebugBody
              debug={debug}
              accounts={accounts}
              isLoading={isLoading}
              onRefresh={onRefresh}
            />
          </DebugPanelErrorBoundary>
        </DialogContent>
      ) : null}
    </Dialog>
  )
}
