import React, { useState, useMemo } from 'react'
import { useData } from '@/context/data-provider'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  SortingState,
  getSortedRowModel,
  ColumnFiltersState,
  getFilteredRowModel,
  sortingFns,
  VisibilityState,
  getExpandedRowModel,
  ExpandedState,
  OnChangeFn,
} from "@tanstack/react-table"
import { Button } from '@/components/ui/button'
import { ChevronRight, ChevronDown, ChevronLeft, Info, Search, Filter, X } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Trade } from '@prisma/client'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn, parsePositionTime } from '@/lib/utils'
import { Checkbox } from "@/components/ui/checkbox"
import { useI18n } from '@/locales/client'
import { TradeComment } from './trade-comment'
import { TradeVideoUrl } from './trade-video-url'
import { TradeTag } from './trade-tag'
import { formatInTimeZone } from 'date-fns-tz'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { DataTableColumnHeader } from './column-header'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { createClient } from '@/lib/supabase'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useUserStore } from '@/store/user-store'
import { useTableConfigStore } from '@/store/table-config-store'
import { useTickDetailsStore } from '@/store/tick-details-store'
import { TradeImageEditor } from './trade-image-editor'
import { ColumnConfigDialog } from '@/components/ui/column-config-dialog'
import { calculateTicksAndPointsForTrades, calculateTicksAndPointsForGroupedTrade } from '@/lib/tick-calculations'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { deleteTradesByIdsAction } from '@/server/accounts'
import { Trash } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu"

// Custom Tags Header Component
function TagsColumnHeader() {
  const t = useI18n()
  const { tagFilter, setTagFilter } = useData()
  const tags = useUserStore(state => state.tags)
  const [searchQuery, setSearchQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  const filteredTags = useMemo(() => {
    return tags?.filter(tag => 
      tag.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) ?? []
  }, [tags, searchQuery])

  const hasActiveFilter = tagFilter.tags.length > 0

  const handleClearFilter = (e: React.MouseEvent) => {
    e.stopPropagation()
    setTagFilter({ tags: [] })
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "-ml-3 h-8 data-[state=open]:bg-accent",
            hasActiveFilter && "bg-accent"
          )}
        >
          <span>{t('trade-table.tags')}</span>
          {hasActiveFilter && (
            <Filter className="ml-1 h-3.5 w-3.5 text-muted-foreground/70" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-80">
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Filter className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
            {t('table.filter')}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-80">
            <div className="grid gap-4 p-2">
              <div className="space-y-2">
                <h4 className="font-medium leading-none">{t('trade-table.tags')}</h4>
                <p className="text-sm text-muted-foreground">
                  {t('widgets.tags.searchPlaceholder')}
                </p>
              </div>
              
              {/* Search input */}
              <div className="flex items-center gap-2 bg-muted/30 rounded-md px-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('widgets.tags.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 h-8 text-sm"
                />
              </div>

              {/* Tags list */}
              <div className="max-h-60 min-h-[100px]">
                <ScrollArea className="h-full">
                  <div className="space-y-1">
                    {filteredTags.map((tag) => (
                      <div
                        key={tag.id}
                        className="flex items-center justify-between rounded-md hover:bg-muted/50 transition-colors p-1.5"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <Checkbox
                            checked={tagFilter.tags.includes(tag.name)}
                            onCheckedChange={(checked) => {
                              setTagFilter(prev => ({
                                tags: checked 
                                  ? [...prev.tags, tag.name]
                                  : prev.tags.filter(t => t !== tag.name)
                              }))
                            }}
                            id={`tag-filter-${tag.id}`}
                            className="h-4 w-4"
                          />
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: tag.color || '#CBD5E1' }}
                          />
                          <label
                            htmlFor={`tag-filter-${tag.id}`}
                            className="font-medium cursor-pointer truncate flex-1 text-sm"
                          >
                            {tag.name}
                          </label>
                        </div>
                      </div>
                    ))}
                    {filteredTags.length === 0 && (
                      <div className="flex items-center justify-center text-muted-foreground h-[100px] text-sm">
                        {searchQuery ? t('widgets.tags.noResults') : t('widgets.tags.noTags')}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearFilter}
                  className="flex-1"
                  disabled={!hasActiveFilter}
                >
                  {t('table.clear')}
                </Button>
                <Button
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="flex-1"
                >
                  {t('table.apply')}
                </Button>
              </div>
            </div>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        
        {hasActiveFilter && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleClearFilter}>
              <X className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
              {t('widgets.tags.clearFilter')} ({tagFilter.tags.length})
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface ExtendedTrade extends Trade {
  imageUrl?: string | undefined
  tags: string[]
  imageBase64: string | null
  imageBase64Second: string | null
  comment: string | null
  videoUrl: string | null
  trades: ExtendedTrade[]
}

const supabase = createClient()

export function TradeTableReview() {
  const t = useI18n()
  const {
    formattedTrades: contextTrades,
    updateTrades,
    refreshTrades,
  } = useData()
  const tags = useUserStore(state => state.tags)
  const timezone = useUserStore(state => state.timezone)
  const tickDetails = useTickDetailsStore(state => state.tickDetails)
  const { toast } = useToast()

  // Debug: Log tick details
  console.log('Available tick details:', tickDetails)

  // Get table configuration from store
  const {
    tables,
    updateSorting,
    updateColumnFilters,
    updateColumnVisibilityState,
    updatePageSize,
    updateGroupingGranularity,
  } = useTableConfigStore()

  const tableConfig = tables['trade-table']
  const [sorting, setSorting] = useState<SortingState>(tableConfig?.sorting || [{ id: "entryDate", desc: true }])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(tableConfig?.columnFilters || [])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(tableConfig?.columnVisibility || {})
  const [expanded, setExpanded] = useState<ExpandedState>({})
  const [pageSize, setPageSize] = useState(tableConfig?.pageSize || 10)
  const [groupingGranularity, setGroupingGranularity] = useState<number>(tableConfig?.groupingGranularity || 0)
  const [selectedTrades, setSelectedTrades] = useState<string[]>([])
  const [showPoints, setShowPoints] = useState(false)

  // Sync local state with store
  React.useEffect(() => {
    if (tableConfig) {
      setSorting(tableConfig.sorting)
      setColumnFilters(tableConfig.columnFilters)
      setColumnVisibility(tableConfig.columnVisibility)
      setPageSize(tableConfig.pageSize)
      setGroupingGranularity(tableConfig.groupingGranularity)
    }
  }, [tableConfig])

  // Update store when local state changes
  const handleSortingChange: OnChangeFn<SortingState> = (updaterOrValue) => {
    const newSorting = typeof updaterOrValue === 'function' ? updaterOrValue(sorting) : updaterOrValue
    setSorting(newSorting)
    updateSorting('trade-table', newSorting)
  }

  const handleColumnFiltersChange: OnChangeFn<ColumnFiltersState> = (updaterOrValue) => {
    const newFilters = typeof updaterOrValue === 'function' ? updaterOrValue(columnFilters) : updaterOrValue
    setColumnFilters(newFilters)
    updateColumnFilters('trade-table', newFilters)
  }

  const handleColumnVisibilityChange: OnChangeFn<VisibilityState> = (updaterOrValue) => {
    const newVisibility = typeof updaterOrValue === 'function' ? updaterOrValue(columnVisibility) : updaterOrValue
    setColumnVisibility(newVisibility)
    updateColumnVisibilityState('trade-table', newVisibility)
  }

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize)
    updatePageSize('trade-table', newPageSize)
  }

  const handleGroupingGranularityChange = (newGranularity: number) => {
    setGroupingGranularity(newGranularity)
    updateGroupingGranularity('trade-table', newGranularity)
  }

  const trades = contextTrades

  const handleGroupTrades = async () => {
    if (selectedTrades.length < 2) return

    // Generate a temporary groupId using timestamp + random number
    const tempGroupId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Update local state immediately
    await updateTrades(selectedTrades, { groupId: tempGroupId })

    // Reset table selection
    table.resetRowSelection()
    setSelectedTrades([])
  }

  const handleUngroupTrades = async () => {
    if (selectedTrades.length === 0) return

    // Update local state immediately
    await updateTrades(selectedTrades, { groupId: null })

    // Reset table selection
    table.resetRowSelection()
    setSelectedTrades([])
  }

  const handleDeleteTrades = async () => {
    if (selectedTrades.length === 0) return

    // Filter out empty IDs (group rows have empty IDs)
    const validTradeIds = selectedTrades.filter(id => id && id !== '')
    if (validTradeIds.length === 0) return

    try {
      await deleteTradesByIdsAction(validTradeIds)
      setSelectedTrades([])
      table.resetRowSelection()
      refreshTrades()
      toast({
        title: t('trade-table.deleteSuccess'),
        description: t('trade-table.deleteSuccessDescription', { count: validTradeIds.length }),
      })
    } catch (error) {
      console.error('Error deleting trades:', error)
      toast({
        title: t('trade-table.deleteError'),
        description: t('trade-table.deleteErrorDescription'),
        variant: "destructive"
      })
    }
  }

  // Group trades by instrument, entry date, and close date with granularity
  const groupedTrades = useMemo(() => {
    const groups = new Map<string, ExtendedTrade>()

    trades.forEach(trade => {
      // Create a key that accounts for granularity
      const entryDate = new Date(trade.entryDate)

      // Round dates based on granularity
      const roundDate = (date: Date) => {
        if (groupingGranularity === 0) return date
        const roundedDate = new Date(date)
        roundedDate.setSeconds(Math.floor(date.getSeconds() / groupingGranularity) * groupingGranularity)
        roundedDate.setMilliseconds(0)
        return roundedDate
      }

      const roundedEntryDate = roundDate(entryDate)

      const key = trade.groupId ? `${trade.groupId}` : `${trade.instrument}-${roundedEntryDate.toISOString()}`

      if (!groups.has(key)) {
        groups.set(key, {
          instrument: trade.instrument,
          entryDate: roundedEntryDate.toISOString(),
          closeDate: trade.closeDate,
          tags: trade.tags,
          imageBase64: trade.imageBase64,
          imageBase64Second: trade.imageBase64Second,
          comment: trade.comment,
          videoUrl: null,
          id: '',
          accountNumber: trade.accountNumber,
          quantity: trade.quantity,
          entryId: null,
          closeId: null,
          entryPrice: trade.entryPrice,
          closePrice: trade.closePrice,
          pnl: trade.pnl,
          timeInPosition: trade.timeInPosition,
          userId: '',
          side: trade.side,
          commission: trade.commission,
          trades: [{
            ...trade,
            trades: []
          }],
          createdAt: new Date(),
          groupId: trade.groupId || null,
        })
      }
      else {
        const group = groups.get(key)!
        group.trades.push({
          ...trade,
          trades: []
        })
        group.pnl += trade.pnl || 0
        group.commission += trade.commission || 0
        group.quantity += trade.quantity || 0
        // Update closeDate to the latest one
        if (new Date(trade.closeDate) > new Date(group.closeDate)) {
          group.closeDate = trade.closeDate
        }
        // Update timeInPosition to the longest one
        if ((trade.timeInPosition || 0) > (group.timeInPosition || 0)) {
          group.timeInPosition = trade.timeInPosition
        }
        if (!group.accountNumber.includes(trade.accountNumber)) {
          group.accountNumber += ':' + trade.accountNumber;
        }
      }
    })

    return Array.from(groups.values())
  }, [trades, groupingGranularity])

  const columns = useMemo<ColumnDef<ExtendedTrade>[]>(() => [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => {
            table.toggleAllPageRowsSelected(!!value)
            // Get all trade IDs including subrows (only actual trades, not group rows)
            const allTradeIds = table.getRowModel().rows.flatMap(row => {
              const subTradeIds = row.original.trades.map(t => t.id)
              // Only include group row ID if it's not empty (i.e., it's an actual trade, not a group)
              const groupId = row.original.id && row.original.id !== '' ? [row.original.id] : []
              return [...groupId, ...subTradeIds]
            })
            setSelectedTrades(value ? allTradeIds : [])
          }}
          aria-label="Select all"
          className="translate-y-[2px]"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => {
            row.toggleSelected(!!value)
            // Get all trade IDs for this row including subrows (only actual trades, not group rows)
            const subTradeIds = row.original.trades.map(t => t.id)
            const groupId = row.original.id && row.original.id !== '' ? [row.original.id] : []
            const tradeIds = [...groupId, ...subTradeIds]
            setSelectedTrades(prev =>
              value
                ? [...prev, ...tradeIds]
                : prev.filter(id => !tradeIds.includes(id))
            )
          }}
          aria-label="Select row"
          className="translate-y-[2px]"
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 40,
    },
    {
      id: "expand",
      header: () => null,
      cell: ({ row }) => {
        const trade = row.original
        if (trade.trades.length <= 1) return null

        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={row.getToggleExpandedHandler()}
            className="hover:bg-transparent"
          >
            {row.getIsExpanded() ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        )
      },
      size: 40,
    },
    {
      id: "accounts",
      header: () => (
        <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8 data-[state=open]:bg-accent"
          >
          {t('trade-table.accounts')}
        </Button>
      ),
      cell: ({ row }) => {
        const trade = row.original
        const accounts = trade.accountNumber.split(':')
        return (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Popover>
                <PopoverTrigger asChild>
                  <div
                    className="flex items-center justify-center w-fit min-w-6 px-2 h-6 rounded-full bg-primary/10 text-xs font-medium cursor-pointer hover:bg-primary/20 transition-colors"
                  >
                    {accounts.length === 1 ? `${accounts[0].slice(0, 2)}${accounts[0].slice(-2)}` : `+${accounts.length}`}
                  </div>
                </PopoverTrigger>
                <PopoverContent
                  className="w-fit p-0"
                  align="start"
                  side="right"
                >
                  <ScrollArea className="h-36 rounded-md border">
                    {accounts.map((account) => (
                      <div
                        key={`account-${account}`}
                        className="px-3 py-2 text-sm hover:bg-muted/50 cursor-default"
                      >
                        {account}
                      </div>
                    ))}
                  </ScrollArea>
                </PopoverContent>
              </Popover>
            </div>
            {trade.trades.length > 0 && (
              <span className="text-xs text-muted-foreground">
                ({trade.trades.length})
              </span>
            )}
          </div>
        )
      },
      size: 120,
    },
    {
      accessorKey: "entryDate",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('trade-table.entryDate')} tableId="trade-table" />
      ),
      cell: ({ row }) => formatInTimeZone(new Date(row.original.entryDate), timezone, 'yyyy-MM-dd'),
      sortingFn: (rowA, rowB, columnId) => {
        const a = new Date(rowA.getValue(columnId)).getTime();
        const b = new Date(rowB.getValue(columnId)).getTime();
        return a < b ? -1 : a > b ? 1 : 0;
      },
      size: 120,
    },
    {
      accessorKey: "instrument",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('trade-table.instrument')} tableId="trade-table" />
      ),
      size: 120,
      cell: ({ row }) => {
        const instrument = row.original.instrument
        return (
          <div className="text-right font-medium">
            {instrument}
          </div>
        )
      },
    },
    {
      accessorKey: "direction",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('trade-table.direction')} tableId="trade-table" />
      ),
      size: 100,
      cell: ({ row }) => {
        return (
          <div className="text-right font-medium">
            {row.original.side?.toUpperCase()}
          </div>
        )
      },
      sortingFn: (rowA, rowB, columnId) => {
        const a = rowA.original.side?.toUpperCase() || ""
        const b = rowB.original.side?.toUpperCase() || ""

        // Sort LONG before SHORT
        if (a === "LONG" && b === "SHORT") return -1
        if (a === "SHORT" && b === "LONG") return 1

        // Alphabetical fallback for any other values
        return a < b ? -1 : a > b ? 1 : 0
      },
    },
    {
      accessorKey: "entryPrice",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('trade-table.entryPrice')} tableId="trade-table" />
      ),
      cell: ({ row }) => {
        const entryPrice = parseFloat(row.original.entryPrice)
        return (
          <div className="text-right font-medium">
            ${entryPrice.toFixed(2)}
          </div>
        )
      },
      size: 100,
    },
    {
      accessorKey: "closePrice",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('trade-table.exitPrice')} tableId="trade-table" />
      ),
      cell: ({ row }) => {
        const exitPrice = parseFloat(row.original.closePrice)
        return (
          <div className="text-right font-medium">
            ${exitPrice.toFixed(2)}
          </div>
        )
      },
      size: 100,
    },
    {
      accessorKey: "timeInPosition",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('trade-table.positionTime')} tableId="trade-table" />
      ),
      cell: ({ row }) => {
        const timeInPosition = row.original.timeInPosition || 0
        return <div>{parsePositionTime(timeInPosition)}</div>
      },
      sortingFn: (rowA, rowB, columnId) => {
        const a = rowA.original.timeInPosition || 0
        const b = rowB.original.timeInPosition || 0
        return a - b
      },
      size: 120,
    },
    {
      accessorKey: "entryTime",
      accessorFn: (row) => row.entryDate,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('trade-table.entryTime')} tableId="trade-table" />
      ),
      cell: ({ row }) => {
        const dateStr = row.original.entryDate
        return <div>{formatInTimeZone(new Date(dateStr), timezone, 'HH:mm:ss')}</div>
      },
      size: 100,
    },
    {
      accessorKey: "closeDate",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('trade-table.exitTime')} tableId="trade-table" />
      ),
      cell: ({ row }) => {
        const dateStr = row.original.closeDate
        return <div>{formatInTimeZone(new Date(dateStr), timezone, 'HH:mm:ss')}</div>
      },
      size: 100,
    },
    {
      accessorKey: "pnl",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('trade-table.pnl')} tableId="trade-table" />
      ),
      cell: ({ row }) => {
        const pnl = row.original.pnl
        return (
          <div className="text-right font-medium">
            <span className={cn(
              pnl >= 0 ? 'text-green-600' : 'text-red-600'
            )}>
              {pnl.toFixed(2)}
            </span>
          </div>
        )
      },
      sortingFn: "basic",
      size: 100,
    },
    {
      accessorKey: "commission",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Commission" tableId="trade-table" />
      ),
      cell: ({ row }) => {
        const commission = row.original.commission
        return (
          <div className="text-right font-medium">
            ${commission.toFixed(2)}
          </div>
        )
      },
      size: 100,
    },
    {
      accessorKey: "quantity",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('trade-table.quantity')} tableId="trade-table" />
      ),
      cell: ({ row }) => {
        const quantity = row.original.quantity
        return (
          <div className="text-right font-medium">
            {quantity.toLocaleString()}
          </div>
        )
      },
      sortingFn: "basic",
      size: 100,
    },
    {
      id: "ticksAndPoints",
      header: ({ column }) => (
        <DataTableColumnHeader 
          column={column} 
          title={showPoints ? t('trade-table.points') : t('trade-table.ticks')} 
          tableId="trade-table" 
          showFilter={true}
          showToggle={true}
          toggleLabel={t('table.showPoints')}
          toggleValue={showPoints}
          onToggleChange={setShowPoints}
        />
      ),
      accessorFn: (row) => {
        const calculation = calculateTicksAndPointsForGroupedTrade(row, tickDetails)
        return showPoints ? calculation.points : calculation.ticks
      },
      cell: ({ row }) => {
        const calculation = calculateTicksAndPointsForGroupedTrade(row.original, tickDetails)
        const value = showPoints ? calculation.points : calculation.ticks
        return (
          <div className="text-right font-medium">
            <span className={cn(
              value >= 0 ? 'text-green-600' : 'text-red-600'
            )}>
              {showPoints ? value.toFixed(2) : value}
            </span>
          </div>
        )
      },
      sortingFn: "basic",
      size: 100,
      filterFn: (row, columnId, filterValue) => {
        const value = row.getValue(columnId) as number
        const { min, max } = filterValue as { min?: number; max?: number }
        
        if (min !== undefined && value < min) return false
        if (max !== undefined && value > max) return false
        return true
      },
    },
    {
      id: "image",
      header: ({ column }) => (
        <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8 data-[state=open]:bg-accent"
          >
          {t('trade-table.image')}
        </Button>
      ),
      cell: ({ row }) => {
        const trade = row.original
        const tradeIds = trade.trades.length > 0
          ? trade.trades.map(t => t.id)
          : [trade.id]
        return (
          <div className="flex gap-2">
            <div className="relative h-10 w-10">
              <TradeImageEditor
                trade={trade}
                tradeIds={tradeIds}
              />
            </div>
          </div>
        )
      },
    },
    {
      id: "tags",
      header: () => <TagsColumnHeader />,
      cell: ({ row }) => {
        const trade = row.original
        const tradeIds = trade.trades.length > 0
          ? trade.trades.map(t => t.id)
          : [trade.id]
        return (
          <div className="min-w-[200px]">
            <TradeTag
              trade={trade}
              tradeIds={tradeIds}
            />
          </div>
        )
      },
      size: 200,
    },
    {
      accessorKey: "comment",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('trade-table.comment')} tableId="trade-table" />
      ),
      cell: ({ row }) => {
        const trade = row.original
        const tradeIds = trade.trades.length > 0
          ? trade.trades.map(t => t.id)
          : [trade.id]
        return (
          <div className="min-w-[200px]">
            <TradeComment
              tradeIds={tradeIds}
              comment={trade.trades.length > 0 ? trade.trades[0].comment : trade.comment}
            />
          </div>
        )
      },
      size: 200,
    },
    {
      accessorKey: "videoUrl",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('trade-table.videoUrl')} tableId="trade-table" />
      ),
      cell: ({ row }) => {
        const trade = row.original
        const tradeIds = trade.trades.length > 0
          ? trade.trades.map(t => t.id)
          : [trade.id]
        return (
          <div className="min-w-[200px]">
            <TradeVideoUrl
              tradeIds={tradeIds}
              videoUrl={trade.trades.length > 0 ? trade.trades[0].videoUrl : trade.videoUrl}
              onVideoUrlChange={async (videoUrl) => {
                await updateTrades(tradeIds, { videoUrl })
              }}
            />
          </div>
        )
      },
      size: 200,
    }
  ], [t, timezone, tags, expanded, tickDetails, showPoints])

  const table = useReactTable({
    data: groupedTrades,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      expanded,
      pagination: {
        pageIndex: 0,
        pageSize,
      },
    },
    paginateExpandedRows: false,
    onExpandedChange: setExpanded,
    getSubRows: (row) => row.trades,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getRowCanExpand: (row) => row.original.trades.length > 0,
    getExpandedRowModel: getExpandedRowModel(),
    onSortingChange: handleSortingChange,
    onColumnFiltersChange: handleColumnFiltersChange,
    onColumnVisibilityChange: handleColumnVisibilityChange,
    defaultColumn: {
      size: 400,
      minSize: 100,
    },
  })

  return (
    <Card className="h-full flex flex-col">
      <CardHeader
        className="flex flex-row items-center justify-between space-y-0 border-b shrink-0 p-3 sm:p-4 h-[56px]"
      >
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-1.5">
            <CardTitle className="line-clamp-1 text-base">
              {t('trade-table.title')}
            </CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>{t('trade-table.description')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex items-center gap-2">
            {selectedTrades.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteTrades}
              >
                <Trash className="mr-2 h-4 w-4" />
                {t('trade-table.deleteSelected')}
              </Button>
            )}
            {selectedTrades.length >= 2 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleGroupTrades}
              >
                {t('trade-table.groupTrades')}
              </Button>
            )}
            {selectedTrades.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleUngroupTrades}
              >
                {t('trade-table.ungroupTrades')}
              </Button>
            )}
            <Select
              value={groupingGranularity.toString()}
              onValueChange={(value) => handleGroupingGranularityChange(parseInt(value))}
            >
              <SelectTrigger className="w-[180px]">
                <div className="flex items-center w-full">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info 
                          className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors cursor-help mr-2" 
                          onClick={(e) => e.stopPropagation()}
                        />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="z-50">
                        <p>{t('trade-table.granularity.tooltip')}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <SelectValue placeholder={t('trade-table.granularity.label')} />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">{t('trade-table.granularity.exact')}</SelectItem>
                <SelectItem value="5">{t('trade-table.granularity.fiveSeconds')}</SelectItem>
                <SelectItem value="10">{t('trade-table.granularity.tenSeconds')}</SelectItem>
                <SelectItem value="30">{t('trade-table.granularity.thirtySeconds')}</SelectItem>
                <SelectItem value="60">{t('trade-table.granularity.oneMinute')}</SelectItem>
              </SelectContent>
            </Select>
            <ColumnConfigDialog tableId="trade-table" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 overflow-hidden p-0">
        <div className="flex h-full flex-col overflow-hidden">
          <Table className="w-full">
            <TableHeader className="sticky top-0 z-10 bg-background shadow-sm">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className="whitespace-nowrap px-4 py-3 text-left text-sm"
                      style={{ width: header.getSize() }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>

            <TableBody className="flex-1 overflow-auto">
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <React.Fragment key={row.id}>
                    <TableRow
                      data-state={row.getIsSelected() && "selected"}
                      className={cn(
                        "border-b transition-colors hover:bg-muted",
                        row.getIsExpanded()
                          ? "bg-muted"
                          : row.getCanExpand()
                            ? ""
                            : "bg-muted/50"
                      )}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          className="whitespace-nowrap px-4 py-2.5 text-sm"
                          style={{ width: cell.column.getSize() }}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  </React.Fragment>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-between border-t bg-background px-4 py-3">
        <div className="text-sm text-muted-foreground">
          {t('trade-table.totalTrades', { count: groupedTrades.length })}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
            {t('trade-table.previous')}
          </Button>
          <span className="text-sm">
            {t('trade-table.pageInfo', {
              current: table.getState().pagination.pageIndex + 1,
              total: table.getPageCount()
            })}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            {t('trade-table.next')}
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const newPageSize = pageSize + 10
              handlePageSizeChange(newPageSize)
              table.setPageSize(newPageSize)
            }}
          >
            {t('trade-table.pageSize')}
          </Button>
          <Button
            variant="outline"
            className="w-[180px] h-10"
            onClick={() => {
              handlePageSizeChange(10)
              table.resetPageSize()
            }}
          >
            {t('trade-table.resetPageSize')}
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}
