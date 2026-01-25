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
  DndContext,
  closestCenter,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Account, Group } from "@/context/data-provider"
import { cn } from "@/lib/utils"
import { useI18n, useCurrentLocale } from "@/locales/client"
import { Progress } from "@/components/ui/progress"
import { useAccountOrderStore } from "@/store/account-order-store"
import { DataTableColumnHeader } from "../tables/column-header"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ArrowDown,
  ArrowUp,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  GripVertical,
  ListOrdered,
  X,
  XCircle,
} from "lucide-react"

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

type SortOption = {
  id: string
  label: string
}

function SortRuleItem({
  sort,
  label,
  reorderLabel,
  toggleLabel,
  removeLabel,
  onToggleDirection,
  onRemove,
}: {
  sort: SortingState[number]
  label: string
  reorderLabel: string
  toggleLabel: string
  removeLabel: string
  onToggleDirection: () => void
  onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: sort.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 rounded-md border bg-background px-2 py-1.5 text-sm",
        isDragging && "opacity-70 shadow-sm"
      )}
    >
      <button
        type="button"
        className="cursor-grab text-muted-foreground active:cursor-grabbing"
        {...attributes}
        {...listeners}
        aria-label={reorderLabel}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="flex-1 truncate">{label}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onToggleDirection}
        className="h-7 w-7"
        aria-label={toggleLabel}
      >
        {sort.desc ? (
          <ArrowDown className="h-4 w-4" />
        ) : (
          <ArrowUp className="h-4 w-4" />
        )}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onRemove}
        className="h-7 w-7 text-muted-foreground hover:text-foreground"
        aria-label={removeLabel}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}

function isGroupRow(row: AccountRow): row is AccountGroupRow {
  return "kind" in row && row.kind === "group"
}

function getAccountBalance(account: Account) {
  return account.metrics?.currentBalance ?? account.startingBalance ?? 0
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
  sortOptions,
  t,
}: {
  rows: AccountRow[]
  onSelectAccount: (account: Account) => void
  columns: ColumnDef<AccountRow>[]
  sorting: SortingState
  onSortingChange: OnChangeFn<SortingState>
  sortOptions: SortOption[]
  t: ReturnType<typeof useI18n>
}) {
  const [expanded, setExpanded] = useState<ExpandedState>({})
  const [sortingMenuOpen, setSortingMenuOpen] = useState(false)
  const [pendingSortId, setPendingSortId] = useState<string>("")
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )
  const availableSortOptions = sortOptions.filter(
    (option) => !sorting.some((rule) => rule.id === option.id)
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
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getSubRows: (row) => (isGroupRow(row) ? row.accounts : []),
    getRowCanExpand: (row) => isGroupRow(row.original),
    enableMultiSort: true,
  })

  if (rows.length === 0) return null

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-0 text-sm">
        <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur-xs shadow-xs border-b [&_tr]:border-b">
          <tr>
            <th
              colSpan={table.getVisibleLeafColumns().length}
              className="px-3 py-2 text-right"
            >
              <div className="flex items-center justify-start">
                <Popover
                  open={sortingMenuOpen}
                  onOpenChange={setSortingMenuOpen}
                >
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <ListOrdered className="h-4 w-4" />
                      {sorting.length > 0
                        ? t("table.sortingRules", { count: sorting.length })
                        : t("table.sorting")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-80 p-3">
                    <div className="space-y-3">
                      {sorting.length === 0 ? (
                        <div className="text-sm text-muted-foreground">
                          {t("table.noSorting")}
                        </div>
                      ) : (
                        <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={(event: DragEndEvent) => {
                            const { active, over } = event
                            if (!over || active.id === over.id) return
                            const oldIndex = sorting.findIndex(
                              (rule) => rule.id === active.id
                            )
                            const newIndex = sorting.findIndex(
                              (rule) => rule.id === over.id
                            )
                            if (oldIndex === -1 || newIndex === -1) return
                            onSortingChange((prev) =>
                              arrayMove(prev, oldIndex, newIndex)
                            )
                          }}
                        >
                          <SortableContext
                            items={sorting.map((rule) => rule.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                              {sorting.map((rule) => {
                                const label =
                                  sortOptions.find(
                                    (option) => option.id === rule.id
                                  )?.label ?? rule.id
                                return (
                                  <SortRuleItem
                                    key={rule.id}
                                    sort={rule}
                                    label={label}
                                    reorderLabel={t("table.reorderSort")}
                                    toggleLabel={
                                      rule.desc
                                        ? t("table.sortDescending")
                                        : t("table.sortAscending")
                                    }
                                    removeLabel={t("table.removeSort")}
                                    onToggleDirection={() =>
                                      onSortingChange((prev) =>
                                        prev.map((item) =>
                                          item.id === rule.id
                                            ? { ...item, desc: !item.desc }
                                            : item
                                        )
                                      )
                                    }
                                    onRemove={() =>
                                      onSortingChange((prev) =>
                                        prev.filter(
                                          (item) => item.id !== rule.id
                                        )
                                      )
                                    }
                                  />
                                )
                              })}
                            </div>
                          </SortableContext>
                        </DndContext>
                      )}
                      <div className="flex items-center gap-2">
                        <Select
                          value={pendingSortId}
                          onValueChange={(value) => {
                            const nextValue = value === "__none" ? "" : value
                            setPendingSortId(nextValue)
                            if (nextValue) {
                              onSortingChange((prev) => [
                                ...prev,
                                { id: nextValue, desc: false },
                              ])
                              setPendingSortId("")
                            }
                          }}
                        >
                          <SelectTrigger className="h-8 flex-1">
                            <SelectValue
                              placeholder={t("table.pickSortColumn")}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {availableSortOptions.length === 0 ? (
                              <SelectItem value="__none" disabled>
                                {t("table.noMoreSortOptions")}
                              </SelectItem>
                            ) : (
                              availableSortOptions.map((option) => (
                                <SelectItem key={option.id} value={option.id}>
                                  {option.label}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center justify-between">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onSortingChange([])}
                          disabled={sorting.length === 0}
                        >
                          {t("table.clearSorting")}
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </th>
          </tr>
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
  const currentLocale = useCurrentLocale()
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(currentLocale, { dateStyle: "medium" }),
    [currentLocale]
  )
  const { getOrderedAccounts } = useAccountOrderStore()
  const [sorting, setSorting] = useState<SortingState>([
    { id: "group", desc: false },
    { id: "account", desc: false },
  ])

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

  const sortOptions = useMemo<SortOption[]>(
    () => [
      { id: "group", label: t("accounts.table.group") },
      { id: "account", label: t("accounts.table.account") },
      { id: "propfirm", label: t("accounts.table.propfirm") },
      { id: "startDate", label: t("accounts.table.startDate") },
      { id: "funded", label: t("accounts.table.funded") },
      { id: "balance", label: t("accounts.table.balance") },
      { id: "targetProgress", label: t("accounts.table.targetProgress") },
      { id: "drawdown", label: t("accounts.table.drawdownRemaining") },
      { id: "consistency", label: t("propFirm.card.consistency") },
      { id: "maxDailyProfit", label: t("propFirm.card.highestDailyProfit") },
      { id: "tradingDays", label: t("propFirm.card.tradingDays") },
    ],
    [t]
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
        sortOptions={sortOptions}
        t={t}
      />
    </div>
  )
}
