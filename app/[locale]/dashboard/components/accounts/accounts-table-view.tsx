"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getSortedRowModel,
  ExpandedState,
  OnChangeFn,
  SortingState,
  useReactTable,
} from "@tanstack/react-table"
import { Account, Group } from "@/context/data-provider"
import { cn } from "@/lib/utils"
import { useI18n, useCurrentLocale } from "@/locales/client"
import { Progress } from "@/components/ui/progress"
import { useAccountOrderStore } from "@/store/account-order-store"
import { useAccountsGroupExpansionStore } from "../../../../../store/accounts-group-expansion-store"
import { DataTableColumnHeader } from "../tables/column-header"
import { CheckCircle, ChevronDown, ChevronRight, XCircle } from "lucide-react"

type AccountGroupRow = {
  kind: "group"
  id: string
  name: string
  accounts: Account[]
  summary: {
    totalBalance: number
    totalPayouts: number
    totalRemainingToTarget: number
    totalRemainingLoss: number
    averageProgress: number
    configuredCount: number
    fundedCount: number
  }
}

type AccountRow = Account | AccountGroupRow

type SummaryRow = {
  id: string
  label: string
  summary: AccountGroupRow["summary"]
  accountCount: number
}

interface AccountsTableViewProps {
  accounts: Account[]
  groups: Group[]
  onSelectAccount: (account: Account) => void
  sorting: SortingState
  onSortingChange: OnChangeFn<SortingState>
}

function toValidDate(value: Date | string | null | undefined) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function getAccountStartDate(account: Account) {
  const tradeDates = (account.trades ?? [])
    .map((trade) => toValidDate(trade.entryDate))
    .filter((date): date is Date => Boolean(date))
    .sort((a, b) => a.getTime() - b.getTime())

  if (tradeDates.length > 0) return tradeDates[0]

  const dailyDates = (account.dailyMetrics ?? [])
    .map((metric) => toValidDate(metric.date))
    .filter((date): date is Date => Boolean(date))
    .sort((a, b) => a.getTime() - b.getTime())

  return dailyDates[0] ?? null
}

function isGroupRow(row: AccountRow): row is AccountGroupRow {
  return "kind" in row && row.kind === "group"
}

function getAccountBalance(account: Account) {
  return account.metrics?.currentBalance ?? account.startingBalance ?? 0
}

function getAccountTotalPayouts(account: Account) {
  return (account.payouts ?? [])
    .filter((payout) => payout.status === "PAID" || payout.status === "VALIDATED")
    .reduce((sum, payout) => sum + payout.amount, 0)
}

function getAccountsSummary(accounts: Account[]) {
  const summary = accounts.reduce(
    (acc, account) => {
      const currentBalance = getAccountBalance(account)
      const metrics = account.metrics
      acc.totalBalance += currentBalance
      acc.totalPayouts += getAccountTotalPayouts(account)
      if (metrics?.isConfigured) {
        acc.totalRemainingToTarget += metrics.remainingToTarget ?? 0
        acc.totalRemainingLoss += metrics.remainingLoss ?? 0
        acc.totalProgress += metrics.progress ?? 0
        acc.configuredCount += 1
      }
      if (account.isPerformance === true) acc.fundedCount += 1
      return acc
    },
    {
      totalBalance: 0,
      totalPayouts: 0,
      totalRemainingToTarget: 0,
      totalRemainingLoss: 0,
      totalProgress: 0,
      configuredCount: 0,
      fundedCount: 0,
    }
  )

  return {
    totalBalance: summary.totalBalance,
    totalPayouts: summary.totalPayouts,
    totalRemainingToTarget: summary.totalRemainingToTarget,
    totalRemainingLoss: summary.totalRemainingLoss,
    averageProgress:
      summary.configuredCount > 0
        ? summary.totalProgress / summary.configuredCount
        : 0,
    configuredCount: summary.configuredCount,
    fundedCount: summary.fundedCount,
  }
}

function getGroupAccountSortKey(groupRow: AccountGroupRow) {
  const numbers = groupRow.accounts
    .map((account) => account.number || "")
    .filter((value) => value.length > 0)
  if (numbers.length === 0) return ""
  return numbers.reduce((min, value) =>
    value.localeCompare(min, undefined, { sensitivity: "base" }) < 0 ? value : min
  )
}

function AccountsTableSection({
  rows,
  onSelectAccount,
  columns,
  sorting,
  onSortingChange,
  totalSummary,
}: {
  rows: AccountRow[]
  onSelectAccount: (account: Account) => void
  columns: ColumnDef<AccountRow>[]
  sorting: SortingState
  onSortingChange: OnChangeFn<SortingState>
  totalSummary?: SummaryRow | null
}) {
  const t = useI18n()
  const expanded = useAccountsGroupExpansionStore((state) => state.expanded)
  const setExpanded = useAccountsGroupExpansionStore((state) => state.setExpanded)
  const tableWrapperRef = useRef<HTMLDivElement | null>(null)
  const [isHintDismissed, setIsHintDismissed] = useState(true)
  const [canScrollHorizontally, setCanScrollHorizontally] = useState(false)
  const handleExpandedChange = useCallback<OnChangeFn<ExpandedState>>(
    (updater) => {
      const nextExpanded =
        typeof updater === "function" ? updater(expanded) : updater
      setExpanded(nextExpanded)
    },
    [expanded, setExpanded]
  )
  const isDrawdownBreached = (row: AccountRow) => {
    if (isGroupRow(row)) return false
    const drawdownThreshold = row.drawdownThreshold ?? 0
    const remainingLoss = row.metrics?.remainingLoss
    return drawdownThreshold > 0 && remainingLoss !== undefined && remainingLoss <= 0
  }
  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, expanded },
    onSortingChange,
    onExpandedChange: handleExpandedChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getSubRows: (row) => (isGroupRow(row) ? row.accounts : []),
    getRowCanExpand: (row) => isGroupRow(row.original),
    getRowId: (row, index) => {
      if (isGroupRow(row)) return row.id
      return row.id ?? row.number ?? String(index)
    },
    enableMultiSort: true,
  })

  const visibleRows = table.getRowModel().rows
  const displayRows: Array<
    | { type: "row"; row: (typeof visibleRows)[number] }
    | { type: "summary"; summary: SummaryRow }
  > = []

  for (let index = 0; index < visibleRows.length; index += 1) {
    const row = visibleRows[index]
    displayRows.push({ type: "row", row })
  }

  if (totalSummary) {
    displayRows.push({
      type: "summary",
      summary: totalSummary,
    })
  }

  useEffect(() => {
    const storedValue = localStorage.getItem("accountsTableScrollHintDismissed")
    setIsHintDismissed(storedValue === "true")
  }, [])

  useEffect(() => {
    const updateScrollState = () => {
      const wrapper = tableWrapperRef.current
      if (!wrapper) return
      setCanScrollHorizontally(wrapper.scrollWidth > wrapper.clientWidth + 1)
    }

    updateScrollState()
    window.addEventListener("resize", updateScrollState)
    return () => window.removeEventListener("resize", updateScrollState)
  }, [displayRows.length, columns.length])

  const showScrollHint = canScrollHorizontally && !isHintDismissed
  const handleDismissHint = () => {
    localStorage.setItem("accountsTableScrollHintDismissed", "true")
    setIsHintDismissed(true)
  }

  if (rows.length === 0) return null

  const renderSummaryCell = (columnId: string, summary: SummaryRow) => {
    switch (columnId) {
      case "expand":
        return null
      case "group":
        return (
          <div className="min-w-[160px] font-semibold truncate">
            {summary.label}
          </div>
        )
      case "account":
      case "propfirm":
        return <span className="text-sm text-muted-foreground">—</span>
      case "startDate":
        return (
          <div className="text-sm text-muted-foreground text-center">—</div>
        )
      case "funded":
        return (
          <div className="flex items-center justify-center text-xs text-muted-foreground">
            {summary.summary.fundedCount}/{summary.accountCount}
          </div>
        )
      case "balance":
        return (
          <div className="text-right font-semibold">
            ${summary.summary.totalBalance.toFixed(2)}
          </div>
        )
      case "targetProgress": {
        const isConfigured = summary.summary.configuredCount > 0
        if (!isConfigured) {
          return (
            <div className="text-xs text-muted-foreground">
              {t("accounts.table.notConfigured")}
            </div>
          )
        }
        return (
          <div className="min-w-[160px] space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{t("accounts.table.remaining")}</span>
              <span>${summary.summary.totalRemainingToTarget.toFixed(2)}</span>
            </div>
            <Progress
              value={summary.summary.averageProgress}
              className="h-1.5"
              indicatorClassName={cn(
                "transition-colors duration-300",
                "bg-[hsl(var(--chart-6))]"
              )}
            />
          </div>
        )
      }
      case "totalPayout":
        return (
          <div className="text-right font-semibold">
            ${summary.summary.totalPayouts.toFixed(2)}
          </div>
        )
      case "drawdown":
        return (
          <div className="text-right text-sm text-muted-foreground">
            ${summary.summary.totalRemainingLoss.toFixed(2)}
          </div>
        )
      case "consistency":
      case "maxDailyProfit":
      case "tradingDays":
        return (
          <div className="text-right text-sm text-muted-foreground">—</div>
        )
      default:
        return <span className="text-sm text-muted-foreground">—</span>
    }
  }

  return (
    <div className="relative">
      <div className="overflow-x-auto" ref={tableWrapperRef}>
        <table className="w-full border-separate border-spacing-0 text-sm">
        <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur-xs shadow-xs border-b [&_tr]:border-b">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr
              key={headerGroup.id}
              className="border-b transition-colors hover:bg-muted/50"
            >
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="whitespace-nowrap px-3 py-2 text-left text-sm font-semibold bg-muted/90 border-r border-border last:border-r-0 first:border-l align-middle text-muted-foreground"
                  style={{ width: header.getSize() }}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="bg-background [&_tr:last-child]:border-0">
          {displayRows.map((entry, rowIndex) => {
            if (entry.type === "summary") {
              return (
                <tr
                  key={entry.summary.id}
                className="border-b border-border bg-muted/50 font-semibold"
                >
                  {table.getVisibleLeafColumns().map((column) => (
                    <td
                      key={`${entry.summary.id}-${column.id}`}
                      className="px-3 py-2 text-sm border-r border-border/50 last:border-r-0 first:border-l align-middle"
                      style={{ width: column.getSize() }}
                    >
                      {renderSummaryCell(column.id, entry.summary)}
                    </td>
                  ))}
                </tr>
              )
            }

            const row = entry.row
            return (
              <tr
                key={row.id}
                className={cn(
                  "border-b border-border transition-all duration-75 hover:bg-muted/40",
                  rowIndex % 2 === 1 && "bg-muted/20",
                  row.getCanExpand() && "bg-muted/30 font-medium",
                  isDrawdownBreached(row.original) && "opacity-50",
                  (row.getCanExpand() || row.depth > 0) && "cursor-pointer"
                )}
                onClick={() => {
                  if (row.getCanExpand()) {
                    row.toggleExpanded()
                  } else if (!isGroupRow(row.original)) {
                    onSelectAccount(row.original)
                  }
                }}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className={cn(
                      "px-3 py-2 text-sm border-r border-border/50 last:border-r-0 first:border-l align-middle",
                      row.depth > 0 && cell.column.id === "account" && "pl-6"
                    )}
                    style={{ width: cell.column.getSize() }}
                  >
                    {flexRender(
                      cell.column.columnDef.cell,
                      cell.getContext()
                    )}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
        </table>
      </div>
      {showScrollHint && (
        <div className="pointer-events-none absolute bottom-2 right-2">
          <div className="pointer-events-auto flex items-start gap-2 rounded-md border border-border/60 bg-background/90 px-3 py-2 text-xs text-muted-foreground shadow-sm backdrop-blur-sm">
            <span className="max-w-[220px] leading-snug">
              {t("accounts.table.scrollHint")}
            </span>
            <button
              type="button"
              onClick={handleDismissHint}
              className="text-muted-foreground/70 transition-colors hover:text-muted-foreground pointer-cursor"
            >
              <XCircle className="h-4 w-4" />
              <span className="sr-only">{t("accounts.table.dismissHint")}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export function AccountsTableView({
  accounts,
  groups,
  onSelectAccount,
  sorting,
  onSortingChange,
}: AccountsTableViewProps) {
  const t = useI18n()
  const currentLocale = useCurrentLocale()
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(currentLocale, { dateStyle: "medium" }),
    [currentLocale]
  )
  const { getOrderedAccounts } = useAccountOrderStore()

  const columns = useMemo<ColumnDef<AccountRow>[]>(
    () => [
      {
        id: "expand",
        header: () => null,
        enableSorting: false,
        cell: ({ row }) => {
          if (!row.getCanExpand()) return null
          return (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                row.toggleExpanded()
              }}
              className="flex items-center justify-center h-6 w-6 rounded hover:bg-muted/60 transition-colors"
              aria-label={
                row.getIsExpanded()
                  ? t("accounts.table.collapseGroup")
                  : t("accounts.table.expandGroup")
              }
            >
              {row.getIsExpanded() ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          )
        },
        size: 40,
      },
      {
        id: "group",
        accessorFn: (row) => (isGroupRow(row) ? row.name : ""),
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={t("accounts.table.group")}
          />
        ),
        cell: ({ row }) => (
          <div className="min-w-[160px] font-medium truncate">
            {isGroupRow(row.original) ? (
              <span>
                {row.original.name} ({row.original.accounts.length})
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">—</span>
            )}
          </div>
        ),
        sortingFn: (rowA, rowB) => {
          const a = isGroupRow(rowA.original) ? rowA.original.name : ""
          const b = isGroupRow(rowB.original) ? rowB.original.name : ""
          return a.localeCompare(b)
        },
        size: 200,
      },
      {
        id: "account",
        accessorFn: (row) =>
          isGroupRow(row) ? getGroupAccountSortKey(row) : row.number || "",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={t("accounts.table.account")}
          />
        ),
        cell: ({ row }) => (
          <div className="flex flex-col min-w-[160px]">
            {isGroupRow(row.original) ? (
              <span className="text-sm text-muted-foreground">—</span>
            ) : (
              <>
                <span className="font-medium truncate">
                  {row.original.number}
                </span>
                {row.original.accountSizeName && (
                  <span className="text-xs text-muted-foreground truncate">
                    {row.original.accountSizeName}
                  </span>
                )}
              </>
            )}
          </div>
        ),
        sortingFn: (rowA, rowB) => {
          const a = isGroupRow(rowA.original)
            ? getGroupAccountSortKey(rowA.original)
            : rowA.original.number || ""
          const b = isGroupRow(rowB.original)
            ? getGroupAccountSortKey(rowB.original)
            : rowB.original.number || ""
          return a.localeCompare(b)
        },
        size: 220,
      },
      {
        id: "propfirm",
        accessorFn: (row) =>
          isGroupRow(row) ? "" : row.propfirm || t("propFirm.card.unnamedAccount"),
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={t("accounts.table.propfirm")}
          />
        ),
        cell: ({ row }) => (
          <div className="min-w-[160px] font-medium truncate">
            {isGroupRow(row.original)
              ? "—"
              : row.original.propfirm || t("propFirm.card.unnamedAccount")}
          </div>
        ),
        sortingFn: (rowA, rowB) => {
          const a = isGroupRow(rowA.original)
            ? ""
            : rowA.original.propfirm || ""
          const b = isGroupRow(rowB.original)
            ? ""
            : rowB.original.propfirm || ""
          return a.localeCompare(b)
        },
        size: 200,
      },
      {
        id: "startDate",
        accessorFn: (row) =>
          isGroupRow(row)
            ? Number.POSITIVE_INFINITY
            : getAccountStartDate(row)?.getTime() ?? Number.POSITIVE_INFINITY,
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={t("accounts.table.startDate")}
          />
        ),
        cell: ({ row }) => {
          if (isGroupRow(row.original)) {
            return (
              <div className="text-sm text-muted-foreground text-center">—</div>
            )
          }
          const startDate = getAccountStartDate(row.original)
          if (!startDate) {
            return (
              <div className="text-sm text-muted-foreground text-center">—</div>
            )
          }
          return (
            <div className="text-sm font-medium">
              {dateFormatter.format(startDate)}
            </div>
          )
        },
        sortingFn: (rowA, rowB) => {
          const a = isGroupRow(rowA.original)
            ? Number.POSITIVE_INFINITY
            : getAccountStartDate(rowA.original)?.getTime() ??
              Number.POSITIVE_INFINITY
          const b = isGroupRow(rowB.original)
            ? Number.POSITIVE_INFINITY
            : getAccountStartDate(rowB.original)?.getTime() ??
              Number.POSITIVE_INFINITY
          return a - b
        },
        size: 140,
      },
      {
        id: "funded",
        accessorFn: (row) =>
          isGroupRow(row)
            ? row.summary.fundedCount
            : row.evaluation === false
              ? 1
              : 0,
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={t("accounts.table.funded")}
          />
        ),
        cell: ({ row }) => {
          if (isGroupRow(row.original)) {
            return (
              <div className="flex items-center justify-center text-xs text-muted-foreground">
                {row.original.summary.fundedCount}/{row.original.accounts.length}
              </div>
            )
          }
          const isFunded = row.original.isPerformance === true
          return (
            <div className="flex items-center justify-center">
              {isFunded ? (
                <>
                  <CheckCircle className="h-4 w-4 text-success text-green-500" />
                  <span className="sr-only">{t("accounts.table.fundedYes")}</span>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 text-muted-foreground/60" />
                  <span className="sr-only">{t("accounts.table.fundedNo")}</span>
                </>
              )}
            </div>
          )
        },
        sortingFn: (rowA, rowB) => {
          const a = isGroupRow(rowA.original)
            ? rowA.original.summary.fundedCount
            : rowA.original.evaluation === false
              ? 1
              : 0
          const b = isGroupRow(rowB.original)
            ? rowB.original.summary.fundedCount
            : rowB.original.evaluation === false
              ? 1
              : 0
          return a - b
        },
        size: 90,
      },
      {
        id: "balance",
        accessorFn: (row) =>
          isGroupRow(row) ? row.summary.totalBalance : getAccountBalance(row),
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={t("accounts.table.balance")}
          />
        ),
        cell: ({ row }) => {
          const currentBalance = isGroupRow(row.original)
            ? row.original.summary.totalBalance
            : getAccountBalance(row.original)
          return (
            <div className="text-right font-medium">
              ${currentBalance?.toFixed(2)}
            </div>
          )
        },
        sortingFn: (rowA, rowB) => {
          const a = isGroupRow(rowA.original)
            ? rowA.original.summary.totalBalance
            : getAccountBalance(rowA.original)
          const b = isGroupRow(rowB.original)
            ? rowB.original.summary.totalBalance
            : getAccountBalance(rowB.original)
          return a - b
        },
        size: 120,
      },
      {
        id: "totalPayout",
        accessorFn: (row) =>
          isGroupRow(row)
            ? row.summary.totalPayouts
            : getAccountTotalPayouts(row),
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={t("accounts.table.totalPayout")}
          />
        ),
        cell: ({ row }) => {
          const totalPayouts = isGroupRow(row.original)
            ? row.original.summary.totalPayouts
            : getAccountTotalPayouts(row.original)
          return (
            <div className="text-right font-medium">
              ${totalPayouts.toFixed(2)}
            </div>
          )
        },
        sortingFn: (rowA, rowB) => {
          const a = isGroupRow(rowA.original)
            ? rowA.original.summary.totalPayouts
            : getAccountTotalPayouts(rowA.original)
          const b = isGroupRow(rowB.original)
            ? rowB.original.summary.totalPayouts
            : getAccountTotalPayouts(rowB.original)
          return a - b
        },
        size: 140,
      },
      {
        id: "targetProgress",
        accessorFn: (row) =>
          isGroupRow(row)
            ? row.summary.averageProgress
            : row.metrics?.progress ?? 0,
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={t("accounts.table.targetProgress")}
          />
        ),
        cell: ({ row }) => {
          const metrics = isGroupRow(row.original) ? null : row.original.metrics
          const progress = isGroupRow(row.original)
            ? row.original.summary.averageProgress
            : metrics?.progress ?? 0
          const remainingToTarget = isGroupRow(row.original)
            ? row.original.summary.totalRemainingToTarget
            : metrics?.remainingToTarget ?? 0
          const isConfigured = isGroupRow(row.original)
            ? row.original.summary.configuredCount > 0
            : metrics?.isConfigured ?? false

          if (!isConfigured) {
            return (
              <div className="text-xs text-muted-foreground">
                {t("accounts.table.notConfigured")}
              </div>
            )
          }

          return (
            <div className="min-w-[160px] space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{t("accounts.table.remaining")}</span>
                <span>${remainingToTarget.toFixed(2)}</span>
              </div>
              <Progress
                value={progress}
                className="h-1.5"
                indicatorClassName={cn(
                  "transition-colors duration-300",
                  "bg-[hsl(var(--chart-6))]"
                )}
              />
            </div>
          )
        },
        sortingFn: (rowA, rowB) => {
          const a = isGroupRow(rowA.original)
            ? rowA.original.summary.averageProgress
            : rowA.original.metrics?.progress ?? 0
          const b = isGroupRow(rowB.original)
            ? rowB.original.summary.averageProgress
            : rowB.original.metrics?.progress ?? 0
          return a - b
        },
        size: 200,
      },
      {
        id: "drawdown",
        accessorFn: (row) =>
          isGroupRow(row)
            ? row.summary.totalRemainingLoss
            : row.metrics?.remainingLoss ?? 0,
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={t("accounts.table.drawdownRemaining")}
          />
        ),
        cell: ({ row }) => {
          if (isGroupRow(row.original)) {
            return (
              <div className="text-right text-sm text-muted-foreground">
                ${row.original.summary.totalRemainingLoss.toFixed(2)}
              </div>
            )
          }
          const metrics = row.original.metrics
          const remainingLoss = metrics?.remainingLoss ?? 0
          const isConfigured = metrics?.isConfigured ?? false

          if (!isConfigured) {
            return (
              <div className="text-xs text-muted-foreground">
                {t("accounts.table.notConfigured")}
              </div>
            )
          }

          return (
            <div className="text-right text-sm">
              <span
                className={cn(
                  "font-medium",
                  remainingLoss > (row.original.drawdownThreshold ?? 0) * 0.5
                    ? "text-success"
                    : remainingLoss >
                        (row.original.drawdownThreshold ?? 0) * 0.2
                      ? "text-warning"
                      : "text-destructive"
                )}
              >
                {remainingLoss > 0
                  ? t("propFirm.card.remainingLoss", {
                      amount: remainingLoss.toFixed(2),
                    })
                  : t("propFirm.card.drawdownBreached")}
              </span>
            </div>
          )
        },
        sortingFn: (rowA, rowB) => {
          const a = isGroupRow(rowA.original)
            ? rowA.original.summary.totalRemainingLoss
            : rowA.original.metrics?.remainingLoss ?? 0
          const b = isGroupRow(rowB.original)
            ? rowB.original.summary.totalRemainingLoss
            : rowB.original.metrics?.remainingLoss ?? 0
          return a - b
        },
        size: 200,
      },
      {
        id: "consistency",
        accessorFn: (row) => {
          if (isGroupRow(row)) return -1
          const metrics = row.metrics
          if (!metrics?.hasProfitableData) return 0
          return metrics.isConsistent || row.consistencyPercentage === 100 ? 2 : 1
        },
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={t("propFirm.card.consistency")}
          />
        ),
        cell: ({ row }) => {
          if (isGroupRow(row.original)) {
            return (
              <div className="text-sm text-muted-foreground text-center">—</div>
            )
          }
          const metrics = row.original.metrics
          if (!metrics?.isConfigured) {
            return (
              <div className="text-xs text-muted-foreground">
                {t("accounts.table.notConfigured")}
              </div>
            )
          }
          if (!metrics.hasProfitableData) {
            return (
              <div className="text-xs text-muted-foreground italic">
                {t("propFirm.status.unprofitable")}
              </div>
            )
          }
          const isConsistent =
            metrics.isConsistent || row.original.consistencyPercentage === 100
          return (
            <div
              className={cn(
                "text-xs font-medium",
                isConsistent ? "text-success" : "text-destructive"
              )}
            >
              {isConsistent
                ? t("propFirm.status.consistent")
                : t("propFirm.status.inconsistent")}
            </div>
          )
        },
        sortingFn: (rowA, rowB) => {
          const a = isGroupRow(rowA.original)
            ? -1
            : rowA.original.metrics?.hasProfitableData
              ? rowA.original.metrics.isConsistent ||
                rowA.original.consistencyPercentage === 100
                ? 2
                : 1
              : 0
          const b = isGroupRow(rowB.original)
            ? -1
            : rowB.original.metrics?.hasProfitableData
              ? rowB.original.metrics.isConsistent ||
                rowB.original.consistencyPercentage === 100
                ? 2
                : 1
              : 0
          return a - b
        },
        size: 180,
      },
      {
        id: "maxDailyProfit",
        accessorFn: (row) =>
          isGroupRow(row) ? 0 : row.metrics?.highestProfitDay ?? 0,
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={t("propFirm.card.highestDailyProfit")}
          />
        ),
        cell: ({ row }) => {
          if (isGroupRow(row.original)) {
            return (
              <div className="text-right text-sm text-muted-foreground">—</div>
            )
          }
          const maxDailyProfit = row.original.metrics?.highestProfitDay
          if (maxDailyProfit === undefined) {
            return (
              <div className="text-right text-sm text-muted-foreground">—</div>
            )
          }
          return (
            <div className="text-right text-sm font-medium">
              ${maxDailyProfit.toFixed(2)}
            </div>
          )
        },
        sortingFn: (rowA, rowB) => {
          const a = isGroupRow(rowA.original)
            ? 0
            : rowA.original.metrics?.highestProfitDay ?? 0
          const b = isGroupRow(rowB.original)
            ? 0
            : rowB.original.metrics?.highestProfitDay ?? 0
          return a - b
        },
        size: 140,
      },
      {
        id: "tradingDays",
        accessorFn: (row) =>
          isGroupRow(row) ? 0 : row.metrics?.totalTradingDays ?? 0,
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={t("propFirm.card.tradingDays")}
          />
        ),
        cell: ({ row }) => {
          if (isGroupRow(row.original)) {
            return (
              <div className="text-right text-sm text-muted-foreground">—</div>
            )
          }
          const metrics = row.original.metrics
          if (!metrics?.isConfigured) {
            return (
              <div className="text-xs text-muted-foreground">
                {t("accounts.table.notConfigured")}
              </div>
            )
          }
          const totalTradingDays = metrics.totalTradingDays ?? 0
          const validTradingDays = metrics.validTradingDays ?? 0
          return (
            <div className="text-right text-sm">
              <span
                className={cn(
                  "font-medium",
                  validTradingDays === totalTradingDays
                    ? "text-success"
                    : "text-warning"
                )}
              >
                {validTradingDays}/{totalTradingDays}
              </span>
            </div>
          )
        },
        sortingFn: (rowA, rowB) => {
          const a = isGroupRow(rowA.original)
            ? 0
            : rowA.original.metrics?.totalTradingDays ?? 0
          const b = isGroupRow(rowB.original)
            ? 0
            : rowB.original.metrics?.totalTradingDays ?? 0
          return a - b
        },
        size: 140,
      },
    ],
    [t, dateFormatter]
  )

  const groupedAccounts = useMemo(() => {
    const buildGroupRow = (
      groupId: string,
      groupName: string,
      groupAccounts: Account[]
    ): AccountGroupRow | null => {
      if (groupAccounts.length === 0) return null

      return {
        kind: "group",
        id: groupId,
        name: groupName,
        accounts: groupAccounts,
        summary: getAccountsSummary(groupAccounts),
      }
    }

    const rows: AccountRow[] = []

    groups.forEach((group) => {
      const groupAccounts = accounts.filter((account) =>
        group.accounts.some((a) => a.number === account.number)
      )
      const orderedAccounts = getOrderedAccounts(group.id, groupAccounts)
      const groupRow = buildGroupRow(group.id, group.name, orderedAccounts)
      if (groupRow) rows.push(groupRow)
    })

    const groupedAccountNumbers = new Set(
      groups.flatMap((group) => group.accounts.map((a) => a.number))
    )
    const ungroupedAccounts = accounts.filter(
      (account) => !groupedAccountNumbers.has(account.number ?? "")
    )
    const orderedUngrouped = getOrderedAccounts("ungrouped", ungroupedAccounts)
    const ungroupedRow = buildGroupRow(
      "ungrouped",
      t("propFirm.ungrouped"),
      orderedUngrouped
    )
    if (ungroupedRow) rows.push(ungroupedRow)

    return rows
  }, [accounts, groups, getOrderedAccounts, t])

  const totalSummary = useMemo<SummaryRow | null>(() => {
    if (accounts.length === 0) return null
    return {
      id: "accounts-total",
      label: t("accounts.table.total"),
      summary: getAccountsSummary(accounts),
      accountCount: accounts.length,
    }
  }, [accounts, t])

  return (
    <div className="space-y-6">
      <AccountsTableSection
        rows={groupedAccounts}
        onSelectAccount={onSelectAccount}
        columns={columns}
        sorting={sorting}
        onSortingChange={onSortingChange}
        totalSummary={totalSummary}
      />
    </div>
  )
}
