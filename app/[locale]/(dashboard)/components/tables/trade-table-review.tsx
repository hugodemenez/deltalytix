'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useFormattedTrades, useTrades } from '@/components/context/trades-data'
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
} from "@tanstack/react-table"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Upload, ArrowUpDown, Plus, Search, Trash2, X } from 'lucide-react'
import Image from 'next/image'
import { Trade } from '@prisma/client'
import { ScrollArea } from "@/components/ui/scroll-area"
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

interface ExtendedTrade extends Trade {
  imageUrl?: string | undefined
  direction: string
  tags: string[]
  imageBase64: string | null
}

interface TagInputProps {
  tradeId: string
  tradeTags: string[]
  availableTags: string[]
  onAddTag: (tradeId: string, tag: string) => Promise<void>
}

function TagInput({ tradeId, tradeTags, availableTags, onAddTag }: TagInputProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const t = useI18n()

  return (
    <Popover 
      open={isOpen} 
      onOpenChange={setIsOpen}
    >
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
          <Plus className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0" side="right" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder={t('trade-table.searchTags')}
            value={inputValue}
            onValueChange={setInputValue}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && inputValue) {
                e.preventDefault()
                onAddTag(tradeId, inputValue).then(() => {
                  setInputValue('')
                  setIsOpen(false)
                })
              }
            }}
          />
          <CommandList>
            {inputValue.trim() && (
              <CommandItem
                value={inputValue.trim()}
                onSelect={(value) => {
                  onAddTag(tradeId, value).then(() => {
                    setInputValue('')
                    setIsOpen(false)
                  })
                }}
              >
                {t('trade-table.addTag', { tag: inputValue.trim() })}
              </CommandItem>
            )}
            {availableTags.length > 0 && (
              <CommandGroup heading={t('trade-table.existingTags')}>
                {availableTags
                  .filter(tag => !tradeTags.includes(tag))
                  .filter(tag => {
                    const normalizedInput = inputValue.toLowerCase()
                    return !normalizedInput || tag.toLowerCase().includes(normalizedInput)
                  })
                  .map(tag => (
                    <CommandItem
                      key={tag}
                      value={tag}
                      onSelect={() => {
                        onAddTag(tradeId, tag).then(() => {
                          setInputValue('')
                          setIsOpen(false)
                        })
                      }}
                    >
                      {tag}
                    </CommandItem>
                  ))}
              </CommandGroup>
            )}
            <CommandEmpty>{t('trade-table.noTagsFound')}</CommandEmpty>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

interface TagFilterProps {
  column: any
  availableTags: string[]
  onDeleteTag: (tag: string) => Promise<void>
}

function TagFilter({ column, availableTags, onDeleteTag }: TagFilterProps) {
  const [search, setSearch] = useState('')
  const selectedTags = (column?.getFilterValue() as string[]) || []
  const t = useI18n()

  const filteredTags = availableTags.filter(tag => 
    tag.toLowerCase().includes(search.toLowerCase())
  )

  const toggleTag = (tag: string) => {
    const currentFilters = selectedTags
    const newFilters = currentFilters.includes(tag)
      ? currentFilters.filter(t => t !== tag)
      : [...currentFilters, tag]
    
    column?.setFilterValue(newFilters)
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 h-8 data-[state=open]:bg-accent"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        {t('trade-table.tags')}
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 px-2 lg:px-3",
              selectedTags.length > 0 && "bg-accent"
            )}
          >
            <Search className="h-4 w-4" />
            {selectedTags.length > 0 && (
              <span className="ml-2 text-xs">
                {selectedTags.length}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <Command>
            <CommandInput 
              placeholder={t('trade-table.searchTags')}
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>{t('trade-table.noTagsFound')}</CommandEmpty>
              {filteredTags.length > 0 && (
                <CommandGroup heading={t('trade-table.existingTags')}>
                  {filteredTags.map(tag => (
                    <CommandItem
                      key={tag}
                      className="flex items-center justify-between cursor-pointer"
                      onSelect={(currentValue) => {
                        toggleTag(tag)
                      }}
                    >
                      <div className="flex items-center space-x-2 flex-1">
                        <Checkbox 
                          checked={selectedTags.includes(tag)}
                          onCheckedChange={() => toggleTag(tag)}
                          className="cursor-pointer"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className="flex-1 text-sm font-medium leading-none cursor-pointer">
                          {tag}
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-destructive hover:text-destructive-foreground"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          onDeleteTag(tag)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}

// Add image handling functions
function convertFileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject(new Error('Failed to convert file to base64'))
      }
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

interface TradeTableReviewProps {
  trades?: Trade[]
}

export function TradeTableReview({ trades: propTrades }: TradeTableReviewProps) {
  const t = useI18n()
  const { formattedTrades: contextTrades } = useFormattedTrades()
  const { updateTrade } = useTrades()
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [availableTags, setAvailableTags] = useState<string[]>([])

  const trades = propTrades || contextTrades

  // Initialize available tags from all trades with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      const allTags = new Set<string>()
      trades.forEach(trade => {
        trade.tags?.forEach(tag => allTags.add(tag))
      })
      setAvailableTags(Array.from(allTags))
    }, 100)

    return () => clearTimeout(timer)
  }, [trades])

  const handleAddTag = async (tradeId: string, tag: string) => {
    const normalizedTag = tag.trim().toLowerCase()
    if (!normalizedTag) return

    try {
      await addTagToTrade(tradeId, normalizedTag)
      
      if (!availableTags.includes(normalizedTag)) {
        setAvailableTags(prev => [...prev, normalizedTag])
      }

      const trade = trades.find(t => t.id === tradeId)
      if (trade) {
        updateTrade(tradeId, {
          tags: [...(trade.tags || []), normalizedTag]
        })
      }
    } catch (error) {
      console.error('Failed to add tag:', error)
    }
  }

  const handleRemoveTag = async (tradeId: string, tagToRemove: string) => {
    try {
      await removeTagFromTrade(tradeId, tagToRemove)
      
      const trade = trades.find(t => t.id === tradeId)
      if (trade) {
        updateTrade(tradeId, {
          tags: trade.tags?.filter(tag => tag !== tagToRemove) || []
        })
      }
    } catch (error) {
      console.error('Failed to remove tag:', error)
    }
  }

  const handleDeleteTag = async (tag: string) => {
    try {
      await deleteTagFromAllTrades(tag)
      setAvailableTags(prev => prev.filter(t => t !== tag))
      
      trades
        .filter(trade => trade.tags?.includes(tag))
        .forEach(trade => {
          updateTrade(trade.id, {
            tags: trade.tags?.filter(t => t !== tag) || []
          })
        })
    } catch (error) {
      console.error('Failed to delete tag:', error)
    }
  }

  const handleImageUpload = async (tradeId: string, file: File) => {
    try {
      const base64 = await convertFileToBase64(file)
      await updateTradeImage(tradeId, base64)
      updateTrade(tradeId, { imageBase64: base64 })
    } catch (error) {
      console.error('Failed to upload image:', error)
    }
  }

  const handleImagePaste = async (tradeId: string, e: ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return

    for (const item of Array.from(items)) {
      if (item.type.indexOf('image') === 0) {
        const file = item.getAsFile()
        if (file) {
          await handleImageUpload(tradeId, file)
          break
        }
      }
    }
  }

  const handleRemoveImage = async (tradeId: string) => {
    try {
      await updateTradeImage(tradeId, null)
      updateTrade(tradeId, { imageBase64: null })
    } catch (error) {
      console.error('Failed to remove image:', error)
    }
  }

  useEffect(() => {
    const handleGlobalPaste = async (e: ClipboardEvent) => {
      const activeElement = document.activeElement
      if (activeElement?.getAttribute('data-trade-id')) {
        await handleImagePaste(activeElement.getAttribute('data-trade-id')!, e)
      }
    }

    document.addEventListener('paste', handleGlobalPaste)
    return () => document.removeEventListener('paste', handleGlobalPaste)
  }, [])

  const columns = useMemo<ColumnDef<ExtendedTrade>[]>(() => [
    {
      accessorKey: "entryDate",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hover:bg-transparent px-0 font-medium"
        >
          {t('trade-table.entryDate')}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => new Date(row.getValue("entryDate")).toLocaleDateString(),
    },
    {
      accessorKey: "instrument",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hover:bg-transparent px-0 font-medium"
        >
          {t('trade-table.instrument')}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
    },
    {
      accessorKey: "direction",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hover:bg-transparent px-0 font-medium"
        >
          {t('trade-table.direction')}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
    },
    {
      accessorKey: "timeInPosition",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hover:bg-transparent px-0 font-medium"
        >
          {t('trade-table.positionTime')}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const timeInPosition = parseFloat(row.getValue("timeInPosition") as string) || 0
        return <div>{parsePositionTime(timeInPosition)}</div>
      },
    },
    {
      accessorKey: "entryDate",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hover:bg-transparent px-0 font-medium"
        >
          {t('trade-table.entryTime')}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const dateStr = row.getValue("entryDate") as string
        const date = new Date(dateStr)
        return <div>{date.toLocaleTimeString()}</div>
      },
    },
    {
      accessorKey: "closeDate",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hover:bg-transparent px-0 font-medium"
        >
          {t('trade-table.exitTime')}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const dateStr = row.getValue("closeDate") as string
        const date = new Date(dateStr)
        return <div>{date.toLocaleTimeString()}</div>
      },
    },
    {
      accessorKey: "pnl",
      header: ({ column }) => (
        <div className="text-right">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="hover:bg-transparent px-0 font-medium"
          >
            {t('trade-table.pnl')}
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        </div>
      ),
      cell: ({ row }) => {
        const pnl = parseFloat(row.getValue("pnl"))
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
    },
    {
      accessorKey: "quantity",
      header: ({ column }) => (
        <div className="text-right">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="hover:bg-transparent px-0 font-medium"
          >
            {t('trade-table.quantity')}
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        </div>
      ),
      cell: ({ row }) => {
        const quantity = parseFloat(row.getValue("quantity"))
        return (
          <div className="text-right font-medium">
            {quantity.toLocaleString()}
          </div>
        )
      },
    },
    {
      id: "image",
      header: t('trade-table.image'),
      cell: ({ row }) => {
        const trade = row.original
        return (
          <div 
            className="relative h-10 w-10"
            data-trade-id={trade.id}
            tabIndex={0}
            role="button"
            onPaste={(e: any) => handleImagePaste(trade.id, e)}
          >
            {trade.imageBase64 ? (
              <HoverCard openDelay={200}>
                <HoverCardTrigger asChild>
                  <div className="relative group">
                    <Image
                      src={trade.imageBase64}
                      alt="Trade screenshot"
                      width={40}
                      height={40}
                      className="object-cover rounded cursor-pointer"
                    />
                    <button
                      className="absolute -top-2 -right-2 h-5 w-5 bg-destructive text-destructive-foreground rounded-full hidden group-hover:flex items-center justify-center"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRemoveImage(trade.id)
                      }}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </HoverCardTrigger>
                <HoverCardContent side="right" className="w-[400px] h-[300px] p-0">
                  <div className="relative w-full h-full">
                    <Image
                      src={trade.imageBase64}
                      alt="Trade screenshot"
                      fill
                      className="object-contain rounded"
                    />
                  </div>
                </HoverCardContent>
              </HoverCard>
            ) : (
              <label className="cursor-pointer flex items-center justify-center h-full w-full border-2 border-dashed border-muted-foreground/25 rounded hover:border-muted-foreground/50 transition-colors">
                <Upload className="h-6 w-6 text-muted-foreground/50" />
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleImageUpload(trade.id, file)
                  }}
                />
              </label>
            )}
          </div>
        )
      },
    },
    {
      id: "tags",
      header: ({ column }) => (
        <TagFilter 
          column={column}
          availableTags={availableTags}
          onDeleteTag={handleDeleteTag}
        />
      ),
      cell: ({ row }) => {
        const trade = row.original
        return (
          <div className="flex items-center gap-2">
            <div className="flex gap-1 flex-wrap">
              {trade.tags?.map((tag, index) => (
                <div 
                  key={index} 
                  className="bg-secondary text-secondary-foreground rounded-md px-2 py-1 text-xs flex items-center gap-1"
                >
                  {tag}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRemoveTag(trade.id, tag)
                    }}
                    className="hover:text-destructive"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <TagInput
              tradeId={trade.id}
              tradeTags={trade.tags || []}
              availableTags={availableTags}
              onAddTag={handleAddTag}
            />
          </div>
        )
      },
      filterFn: (row, id, filterValue: string[]) => {
        const tags = row.original.tags
        if (!filterValue.length) return true
        return filterValue.some(tag => tags.includes(tag))
      },
    }
  ], [availableTags, t])

  const tableData = useMemo(() => 
    trades.map(trade => ({
      ...trade,
      imageUrl: undefined,
      direction: trade.side as string,
      tags: trade.tags || [],
    })), [trades]
  )

  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    state: {
      sorting,
      columnFilters,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  })

  // Add ref for scroll sync
  const headerRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)

  // Add scroll sync effect
  useEffect(() => {
    const headerEl = headerRef.current
    const bodyEl = bodyRef.current

    if (!headerEl || !bodyEl) return

    const handleScroll = (e: Event) => {
      const target = e.target as HTMLDivElement
      if (target === bodyEl) {
        headerEl.scrollLeft = target.scrollLeft
      } else if (target === headerEl) {
        bodyEl.scrollLeft = target.scrollLeft
      }
    }

    headerEl.addEventListener('scroll', handleScroll)
    bodyEl.addEventListener('scroll', handleScroll)

    return () => {
      headerEl.removeEventListener('scroll', handleScroll)
      bodyEl.removeEventListener('scroll', handleScroll)
    }
  }, [])

  return (
    <div 
      className="flex flex-col h-full w-full border rounded-md overflow-hidden"
    >
      <div className="flex-1 min-h-0">
        <div className="relative w-full h-full overflow-auto">
          <table className="w-full border-separate border-spacing-0">
            <thead className="sticky top-0 z-20 bg-background">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header, idx) => (
                    <th
                      key={header.id}
                      className={cn(
                        "h-12 px-4 text-left align-middle border-b bg-background whitespace-nowrap",
                        idx === 0 && "sticky left-0 z-30 bg-background"
                      )}
                      style={{ minWidth: idx === 0 ? '150px' : 'auto' }}
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
            <tbody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <tr key={row.id}>
                    {row.getVisibleCells().map((cell, idx) => (
                      <td
                        key={cell.id}
                        className={cn(
                          "px-4 py-2 border-b whitespace-nowrap align-middle",
                          idx === 0 && "sticky left-0 z-10 bg-background"
                        )}
                        style={{ minWidth: idx === 0 ? '150px' : 'auto' }}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="h-24 text-center align-middle text-muted-foreground"
                  >
                    No results.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4 sm:justify-between p-4 border-t bg-background">
        <div className="text-sm text-muted-foreground order-2 sm:order-1">
          {t('trade-table.totalTrades', { count: table.getFilteredRowModel().rows.length })}
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 lg:gap-8 order-1 sm:order-2">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">{t('trade-table.rowsPerPage')}</p>
            <select
              value={table.getState().pagination.pageSize}
              onChange={e => {
                table.setPageSize(Number(e.target.value))
              }}
              className="h-8 w-[70px] rounded-md border border-input bg-transparent px-2"
            >
              {[10, 20, 30, 40, 50].map(pageSize => (
                <option key={pageSize} value={pageSize}>
                  {pageSize}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex w-[100px] items-center justify-center text-sm font-medium">
              {t('trade-table.page', { 
                current: table.getState().pagination.pageIndex + 1,
                total: table.getPageCount()
              })}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                {t('trade-table.previous')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                {t('trade-table.next')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
