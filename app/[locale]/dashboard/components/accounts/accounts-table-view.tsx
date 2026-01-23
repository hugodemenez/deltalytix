"use client"

import { useMemo, useState } from "react"
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
import {
  addMonths,
  addWeeks,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
  Locale,
} from "date-fns"
import { enUS, fr } from "date-fns/locale"

import { Account, Group } from "@/context/data-provider"
import { cn } from "@/lib/utils"
import { useI18n, useCurrentLocale } from "@/locales/client"
import { Progress } from "@/components/ui/progress"
import { useAccountOrderStore } from "@/store/account-order-store"
import { SparkLineChart } from "@/components/SparkChart"
import { DataTableColumnHeader } from "../tables/column-header"
import { CheckCircle, ChevronDown, ChevronRight, XCircle } from "lucide-react"

type DailyPnlPoint = {
  date: Date
  pnl: number
}

type SparkPoint = {
  period: string
  pnl: number
}

type AccountGroupRow = {
  kind: "group"
  id: string
  name: string
  accounts: Account[]
  summary: {
    totalBalance: number
    totalRemainingToTarget: number
    totalRemainingLoss: number
    averageProgress: number
    configuredCount: number
    fundedCount: number
  }
}

type AccountRow = Account | AccountGroupRow

interface AccountsTableViewProps {
  accounts: Account[]
  groups: Group[]
  onSelectAccount: (account: Account) => void
}

function getDailyPnlPoints(account: Account): DailyPnlPoint[] {
  if (account.dailyMetrics && account.dailyMetrics.length > 0) {
    return account.dailyMetrics.map((metric) => ({
      date: metric.date,
      pnl: metric.pnl,
    }))
  }

  const dailyPnL = account.metrics?.dailyPnL ?? {}
  return Object.entries(dailyPnL)
    .map(([date, pnl]) => ({ date: new Date(date), pnl }))
    .filter((point) => !Number.isNaN(point.date.getTime()))
}

function sumPnLInRange(points: DailyPnlPoint[], start: Date, end: Date) {
  return points.reduce((sum, point) => {
    if (point.date >= start && point.date < end) {
      return sum + point.pnl
    }
    return sum
  }, 0)
}

function buildWeeklySpark(
  points: DailyPnlPoint[],
  locale: Locale
): SparkPoint[] {
  const latestDate = points.reduce<Date | null>((latest, point) => {
    if (!latest || point.date > latest) return point.date
    return latest
  }, null)
  const anchorDate = latestDate ?? new Date()
  const currentWeekStart = startOfWeek(anchorDate, { locale })
  const priorWeekStart = subWeeks(currentWeekStart, 1)
  const priorTwoWeekStart = subWeeks(currentWeekStart, 2)
  const currentWeekEnd = addWeeks(currentWeekStart, 1)

  return [
    {
      period: "prior2",
      pnl: sumPnLInRange(points, priorTwoWeekStart, priorWeekStart),
    },
    {
      period: "prior",
      pnl: sumPnLInRange(points, priorWeekStart, currentWeekStart),
    },
    {
      period: "current",
      pnl: sumPnLInRange(points, currentWeekStart, currentWeekEnd),
    },
  ]
}

function buildMonthlySpark(points: DailyPnlPoint[]): SparkPoint[] {
  const latestDate = points.reduce<Date | null>((latest, point) => {
    if (!latest || point.date > latest) return point.date
    return latest
  }, null)
  const anchorDate = latestDate ?? new Date()
  const currentMonthStart = startOfMonth(anchorDate)
  const priorMonthStart = subMonths(currentMonthStart, 1)
  const priorTwoMonthStart = subMonths(currentMonthStart, 2)
  const currentMonthEnd = addMonths(currentMonthStart, 1)

  return [
    {
      period: "prior2",
      pnl: sumPnLInRange(points, priorTwoMonthStart, priorMonthStart),
    },
    {
      period: "prior",
      pnl: sumPnLInRange(points, priorMonthStart, currentMonthStart),
    },
    {
      period: "current",
      pnl: sumPnLInRange(points, currentMonthStart, currentMonthEnd),
    },
  ]
}

function isGroupRow(row: AccountRow): row is AccountGroupRow {
  return "kind" in row && row.kind === "group"
}

function getAccountBalance(account: Account) {
  return account.metrics?.currentBalance ?? account.startingBalance ?? 0
}

function AccountsTableSection({
  rows,
  onSelectAccount,
  columns,
  sorting,
  onSortingChange,
}: {
  rows: AccountRow[]
  onSelectAccount: (account: Account) => void
  columns: ColumnDef<AccountRow>[]
  sorting: SortingState
  onSortingChange: OnChangeFn<SortingState>
}) {
  const [expanded, setExpanded] = useState<ExpandedState>({})
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
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getSubRows: (row) => (isGroupRow(row) ? row.accounts : []),
    getRowCanExpand: (row) => isGroupRow(row.original),
  })

  if (rows.length === 0) return null

  return (
    <div className="overflow-x-auto">
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
          {table.getRowModel().rows.map((row, rowIndex) => (
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
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function AccountsTableView({
  accounts,
  groups,
  onSelectAccount,
}: AccountsTableViewProps) {
  const t = useI18n()
  const locale = useCurrentLocale()
  const dateLocale = locale === "fr" ? fr : enUS
  const { getOrderedAccounts } = useAccountOrderStore()
  const [sorting, setSorting] = useState<SortingState>([
    { id: "account", desc: false },
  ])

  const columns = useMemo<ColumnDef<AccountRow>[]>(
    () => [
      {
        id: "expand",
        header: () => null,
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
        id: "account",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={t("accounts.table.account")}
          />
        ),
        cell: ({ row }) => (
          <div className="flex flex-col min-w-[160px]">
            {isGroupRow(row.original) ? (
              <span className="font-medium truncate">
                {row.original.name} ({row.original.accounts.length})
              </span>
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
            ? rowA.original.name
            : rowA.original.number || ""
          const b = isGroupRow(rowB.original)
            ? rowB.original.name
            : rowB.original.number || ""
          return a.localeCompare(b)
        },
        size: 220,
      },
      {
        id: "propfirm",
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
            ? rowA.original.name
            : rowA.original.propfirm || ""
          const b = isGroupRow(rowB.original)
            ? rowB.original.name
            : rowB.original.propfirm || ""
          return a.localeCompare(b)
        },
        size: 200,
      },
      {
        id: "funded",
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
        id: "targetProgress",
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
        id: "weeklyTrend",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={t("accounts.table.weeklyTrend")}
          />
        ),
        cell: ({ row }) => {
          if (isGroupRow(row.original)) {
            return (
              <div className="text-right text-sm text-muted-foreground">—</div>
            )
          }
          const points = getDailyPnlPoints(row.original)
          const sparkData = buildWeeklySpark(points, dateLocale)
          const recentTwoTotal = sparkData
            .slice(-2)
            .reduce((sum, point) => sum + point.pnl, 0)
          const sparkColor =
            recentTwoTotal >= 0
              ? "hsl(var(--success))"
              : "hsl(var(--destructive))"
          return (
            <div className="min-w-[80px]">
              <SparkLineChart
                data={sparkData}
                index="period"
                categories={["pnl"]}
                colors={{ pnl: sparkColor }}
                height={28}
              />
            </div>
          )
        },
        sortingFn: (rowA, rowB) => {
          const a = isGroupRow(rowA.original)
            ? 0
            : buildWeeklySpark(
                getDailyPnlPoints(rowA.original),
                dateLocale
              ).reduce((sum, point) => sum + point.pnl, 0)
          const b = isGroupRow(rowB.original)
            ? 0
            : buildWeeklySpark(
                getDailyPnlPoints(rowB.original),
                dateLocale
              ).reduce((sum, point) => sum + point.pnl, 0)
          return a - b
        },
        size: 120,
      },
      {
        id: "monthlyTrend",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={t("accounts.table.monthlyTrend")}
          />
        ),
        cell: ({ row }) => {
          if (isGroupRow(row.original)) {
            return (
              <div className="text-right text-sm text-muted-foreground">—</div>
            )
          }
          const points = getDailyPnlPoints(row.original)
          const sparkData = buildMonthlySpark(points)
          const recentTwoTotal = sparkData
            .slice(-2)
            .reduce((sum, point) => sum + point.pnl, 0)
          const sparkColor =
            recentTwoTotal >= 0
              ? "hsl(var(--success))"
              : "hsl(var(--destructive))"
          return (
            <div className="min-w-[80px]">
              <SparkLineChart
                data={sparkData}
                index="period"
                categories={["pnl"]}
                colors={{ pnl: sparkColor }}
                height={28}
              />
            </div>
          )
        },
        sortingFn: (rowA, rowB) => {
          const a = isGroupRow(rowA.original)
            ? 0
            : buildMonthlySpark(getDailyPnlPoints(rowA.original)).reduce(
                (sum, point) => sum + point.pnl,
                0
              )
          const b = isGroupRow(rowB.original)
            ? 0
            : buildMonthlySpark(getDailyPnlPoints(rowB.original)).reduce(
                (sum, point) => sum + point.pnl,
                0
              )
          return a - b
        },
        size: 120,
      },
    ],
    [t, dateLocale]
  )

  const groupedAccounts = useMemo(() => {
    const buildGroupRow = (
      groupId: string,
      groupName: string,
      groupAccounts: Account[],
      index: number
    ): AccountGroupRow | null => {
      if (groupAccounts.length === 0) return null

      const summary = groupAccounts.reduce(
        (acc, account) => {
          const currentBalance = getAccountBalance(account)
          const metrics = account.metrics
          acc.totalBalance += currentBalance
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
          totalRemainingToTarget: 0,
          totalRemainingLoss: 0,
          totalProgress: 0,
          configuredCount: 0,
          fundedCount: 0,
        }
      )

      return {
        kind: "group",
        id: `${groupId}-${index}`,
        name: groupName,
        accounts: groupAccounts,
        summary: {
          totalBalance: summary.totalBalance,
          totalRemainingToTarget: summary.totalRemainingToTarget,
          totalRemainingLoss: summary.totalRemainingLoss,
          averageProgress:
            summary.configuredCount > 0
              ? summary.totalProgress / summary.configuredCount
              : 0,
          configuredCount: summary.configuredCount,
          fundedCount: summary.fundedCount,
        },
      }
    }

    const rows: AccountRow[] = []

    groups.forEach((group, index) => {
      const groupAccounts = accounts.filter((account) =>
        group.accounts.some((a) => a.number === account.number)
      )
      const orderedAccounts = getOrderedAccounts(group.id, groupAccounts)
      const groupRow = buildGroupRow(group.id, group.name, orderedAccounts, index)
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
      orderedUngrouped,
      rows.length
    )
    if (ungroupedRow) rows.push(ungroupedRow)

    return rows
  }, [accounts, groups, getOrderedAccounts, t])

  return (
    <div className="space-y-6">
      <AccountsTableSection
        rows={groupedAccounts}
        onSelectAccount={onSelectAccount}
        columns={columns}
        sorting={sorting}
        onSortingChange={setSorting}
      />
    </div>
  )
}
