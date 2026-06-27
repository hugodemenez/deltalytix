"use client"

import { useMemo, useState } from "react"
import { Bug, Copy, Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { useI18n } from "@/locales/client"
import { Account } from "@/context/data-provider"
import {
  buildRithmicBalancesDebugReport,
  RithmicBalancesDebugInfo,
} from "@/hooks/use-rithmic-balances"
import { getPrimaryRithmicBalance } from "@/lib/rithmic-api"
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

export function RithmicBalancesDebugPanel({
  debug,
  accounts,
  isLoading,
  onRefresh,
  className,
}: RithmicBalancesDebugPanelProps) {
  const t = useI18n()
  const [open, setOpen] = useState(false)

  const dashboardAccountNumbers = useMemo(
    () => accounts.map((account) => account.number).filter(Boolean) as string[],
    [accounts]
  )

  const report = useMemo(
    () => buildRithmicBalancesDebugReport(debug, dashboardAccountNumbers),
    [debug, dashboardAccountNumbers]
  )

  const accountRows = useMemo(() => {
    const linkedSet = new Set(debug.linkedAccountNumbers)
    return accounts.map((account) => {
      const accountNumber = account.number ?? ""
      const balanceEntry = debug.balancesByAccountId[accountNumber]
      return {
        accountNumber,
        propfirm: account.propfirm ?? "",
        linked: linkedSet.has(accountNumber),
        fetched: Boolean(balanceEntry),
        show:
          linkedSet.has(accountNumber) ||
          Boolean(balanceEntry),
        balance: balanceEntry
          ? getPrimaryRithmicBalance(balanceEntry)
          : null,
      }
    })
  }, [accounts, debug.balancesByAccountId, debug.linkedAccountNumbers])

  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(report)
      toast.success(t("rithmic.balances.debug.copied"))
    } catch {
      toast.error(t("rithmic.balances.debug.copyFailed"))
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={className}
          title={t("rithmic.balances.debug.title")}
        >
          <Bug className="h-3.5 w-3.5" />
          <span className="ml-1.5">{t("rithmic.balances.debug.button")}</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">
        <SheetHeader className="border-b p-4">
          <SheetTitle>{t("rithmic.balances.debug.title")}</SheetTitle>
          <SheetDescription>
            {t("rithmic.balances.debug.description")}
          </SheetDescription>
          <div className="flex flex-wrap gap-2 pt-2">
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
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto p-4 text-sm">
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
                <div className="text-destructive">error: {debug.error}</div>
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
            {debug.fetchAttempts.length === 0 ? (
              <p className="text-muted-foreground text-xs">
                {t("rithmic.balances.debug.noAttempts")}
              </p>
            ) : (
              <div className="space-y-2">
                {debug.fetchAttempts.map((attempt) => (
                  <div
                    key={`${attempt.credentialId}-${attempt.username}`}
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
                    {attempt.message && <div>message: {attempt.message}</div>}
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
                  <div
                    key={row.accountNumber}
                    className="rounded-md border p-3 text-xs"
                  >
                    <div className="font-medium">{row.accountNumber}</div>
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
                      balance:{" "}
                      {row.balance != null ? `$${row.balance.toFixed(2)}` : "—"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-2">
            <h3 className="font-medium">{t("rithmic.balances.debug.rawReport")}</h3>
            <pre className="max-h-64 overflow-auto rounded-md border bg-muted/30 p-3 text-[11px] leading-relaxed">
              {report}
            </pre>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  )
}
