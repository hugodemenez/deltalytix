import React, { useState, useEffect, useMemo, useRef, Fragment, useCallback } from 'react'
import { useUserData } from '@/components/context/user-data'
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
} from "@tanstack/react-table"
import { Button } from '@/components/ui/button'
import { Upload, ArrowUpDown, Plus, Search, Trash2, X, ChevronRight, ChevronDown, ChevronLeft } from 'lucide-react'
import Image from 'next/image'
import { Tag, Trade } from '@prisma/client'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  addTagToTrade,
  removeTagFromTrade,
  deleteTagFromAllTrades,
  updateTradeImage,
} from '@/server/trades'
import { cn, parsePositionTime } from '@/lib/utils'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { Checkbox } from "@/components/ui/checkbox"
import { useI18n } from '@/locales/client'
import { TradeComment } from './trade-comment'
import { TradeVideoUrl } from './trade-video-url'
import { TradeTag } from './trade-tag'
import { formatInTimeZone } from 'date-fns-tz'
import { ImageGallery } from './trade-image-editor'
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
import { TradeImageUploadDialog } from './trade-image-upload-dialog'
import { createClient } from '@/lib/supabase'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card"

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
    updateTrade, 
    timezone, 
    tags,
    setTags
  } = useUserData()
  const [sorting, setSorting] = useState<SortingState>([
    { id: "entryDate", desc: true }
  ])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [expanded, setExpanded] = useState<ExpandedState>({})
  const [pageSize, setPageSize] = useState(10)

  const trades = contextTrades

  const handleRemoveImage = async (tradeIds: string[], isSecondImage: boolean, imageUrl?: string | null) => {
    try {
      // First update the database
      await updateTradeImage(tradeIds, null, isSecondImage ? 'imageBase64Second' : 'imageBase64')
      
      // Then update the local state
      await Promise.all(tradeIds.map(tradeId => 
        updateTrade(tradeId, {
          [isSecondImage ? 'imageBase64Second' : 'imageBase64']: null
        })
      ))

      // Remove the image from Supabase storage
      if (imageUrl) {
        // Extract the path from the full URL
        const path = imageUrl.split('/storage/v1/object/public/trade-images/')[1]
        if (path) {
          await supabase.storage.from('trade-images').remove([path])
        }
      }
    } catch (error) {
      console.error('Error removing image:', error)
    }
  }

  // Group trades by instrument, entry date, and close date
  const groupedTrades = useMemo(() => {
    const groups = new Map<string, ExtendedTrade>()
    
    trades.forEach(trade => {
      const key = `${trade.instrument}-${trade.entryDate}-${trade.closeDate}`
      if (!groups.has(key)) {
        groups.set(key, {
          instrument: trade.instrument,
          entryDate: trade.entryDate,
          closeDate: trade.closeDate,
          tags: trade.tags,
          imageBase64: null,
          imageBase64Second: null,
          comment: null,
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
      if (!group.accountNumber.includes(trade.accountNumber)) {
          group.accountNumber += ':' + trade.accountNumber;
        }
      }
    })
    
    console.log('Grouped trades:', Array.from(groups.values())[0])
    return Array.from(groups.values())
  }, [trades])

  const columns = useMemo<ColumnDef<ExtendedTrade>[]>(() => [
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
          className="hover:bg-transparent px-0 font-medium w-full justify-start"
        >
          {t('trade-table.accounts')}
        </Button>
      ),
      cell: ({ row }) => {
        const trade = row.original
        return (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <TooltipProvider>
                {trade.accountNumber.split(':').length === 1 ? (
                  <Tooltip key={`tooltip-account-${trade.accountNumber}`}>
                    <TooltipTrigger asChild>
                      <div
                        className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-xs font-medium"
                      >
                        {trade.accountNumber.slice(-2)}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{trade.accountNumber}</p>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <Tooltip key={`tooltip-accounts-${trade.accountNumber}`}>
                    <TooltipTrigger asChild>
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-xs font-medium">
                        +{trade.accountNumber.split(':').length}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="flex flex-col gap-1">
                        {trade.accountNumber.split(':').map((account) => (
                          <p key={`tooltip-account-${account}`}>{account}</p>
                        ))}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                )}
              </TooltipProvider>
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
        <DataTableColumnHeader column={column} title={t('trade-table.entryDate')} />
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
        <DataTableColumnHeader column={column} title={t('trade-table.instrument')} />
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
        <DataTableColumnHeader column={column} title={t('trade-table.direction')} />
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
        <DataTableColumnHeader column={column} title={t('trade-table.entryPrice')} />
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
        <DataTableColumnHeader column={column} title={t('trade-table.exitPrice')} />
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
        <DataTableColumnHeader column={column} title={t('trade-table.positionTime')} />
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
        <DataTableColumnHeader column={column} title={t('trade-table.entryTime')} />
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
        <DataTableColumnHeader column={column} title={t('trade-table.exitTime')} />
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
        <DataTableColumnHeader column={column} title={t('trade-table.pnl')} />
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
        <DataTableColumnHeader column={column} title="Commission" />
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
        <DataTableColumnHeader column={column} title={t('trade-table.quantity')} />
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
      id: "image",
      header: ({ column }) => (
        <Button
          variant="ghost"
          className="hover:bg-transparent px-0 font-medium w-full justify-start"
        >
          {t('trade-table.image')}
        </Button>
      ),
      cell: ({ row }) => {
        const trade = row.original
        const tradeIds = trade.trades.length > 0 
          ? trade.trades.map(t => t.id) 
          : [trade.id]
        const imageBase64 = trade.trades.length > 0 ? trade.trades[0].imageBase64 : trade.imageBase64
        const imageBase64Second = trade.trades.length > 0 ? trade.trades[0].imageBase64Second : trade.imageBase64Second
        return (
          <div className="flex gap-2">
            <div className="relative h-10 w-10">
              {imageBase64 ? (
                <ImageGallery 
                  images={imageBase64} 
                  onDelete={() => handleRemoveImage(tradeIds, false, imageBase64)}
                />
              ) : (
                <TradeImageUploadDialog
                  tradeIds={tradeIds}
                  onSuccess={async (imageUrl) => {
                    console.log('Image URL:', imageUrl)
                    // First update the database
                    await updateTradeImage(tradeIds, imageUrl, 'imageBase64')
                    // Then update the local state
                    Promise.all(tradeIds.map(tradeId => 
                      updateTrade(tradeId, { imageBase64: imageUrl })
                    ))
                  }}
                />
              )}
            </div>
            <div className="relative h-10 w-10">
              {imageBase64Second ? (
                <ImageGallery 
                  images={imageBase64Second} 
                  onDelete={() => handleRemoveImage(tradeIds, true, imageBase64Second)}
                />
              ) : (
                <TradeImageUploadDialog
                  tradeIds={tradeIds}
                  isSecondImage
                  onSuccess={(imageUrl) => {
                    // First update the database
                    updateTradeImage(tradeIds, imageUrl, 'imageBase64Second')
                    // Then update the local state
                    Promise.all(tradeIds.map(tradeId => 
                      updateTrade(tradeId, { imageBase64Second: imageUrl })
                    ))
                  }}
                />
              )}
            </div>
          </div>
        )
      },
    },
    {
      id: "tags",
      header: ({ column }) => (
        <Button
          variant="ghost"
          className="hover:bg-transparent px-0 font-medium w-full justify-start"
        >
          {t('trade-table.tags')}
        </Button>
      ),
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
        <DataTableColumnHeader column={column} title={t('trade-table.comment')} />
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
              onCommentChange={(comment) => {
                if (trade.trades.length > 0) {
                  trade.trades.forEach(t => updateTrade(t.id, { comment }))
                } else {
                  updateTrade(trade.id, { comment })
                }
              }}
            />
          </div>
        )
      },
      size: 200,
    },
    {
      accessorKey: "videoUrl",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('trade-table.videoUrl')} />
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
              onVideoUrlChange={(videoUrl) => {
                if (trade.trades.length > 0) {
                  trade.trades.forEach(t => updateTrade(t.id, { videoUrl }))
                } else {
                  updateTrade(trade.id, { videoUrl })
                }
              }}
            />
          </div>
        )
      },
      size: 200,
    }
  ], [t, timezone, tags, expanded])

  const table = useReactTable({
    data: groupedTrades,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      expanded,
    },
    onExpandedChange: setExpanded,
    getSubRows: (row) => row.trades,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getRowCanExpand: (row) => row.original.trades.length > 0,
    getExpandedRowModel: getExpandedRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    defaultColumn: {
      size: 400,
      minSize: 100,
    },
  })

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium">
          {t('trade-table.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 overflow-hidden pt-0">
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
                        "border-b transition-colors",
                        row.getIsExpanded() 
                          ? "bg-muted/50" 
                          : row.getCanExpand() 
                            ? "hover:bg-muted/30" 
                            : "bg-muted hover:bg-muted/50"
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
              setPageSize(pageSize+100)
              table.setPageSize(pageSize)
            }}
          >
            {t('trade-table.pageSize')}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              setPageSize(10)
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
