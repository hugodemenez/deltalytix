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
} from "@tanstack/react-table"
import { Button } from '@/components/ui/button'
import { Upload, ArrowUpDown, Plus, Search, Trash2, X, ChevronRight, ChevronDown, ChevronLeft } from 'lucide-react'
import Image from 'next/image'
import { Trade } from '@prisma/client'
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

interface ExtendedTrade extends Trade {
  imageUrl?: string | undefined
  direction: string
  tags: string[]
  imageBase64: string | null
  comment: string | null
  videoUrl: string | null
}

interface AccountGroup {
  accountNumber: string
  isExpanded: boolean
  trades: ExtendedTrade[]
  isLoading: boolean
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
  const { tagFilter, setTagFilter } = useUserData()
  const selectedTags = tagFilter.tags
  const t = useI18n()

  const filteredTags = availableTags.filter(tag => 
    tag.toLowerCase().includes(search.toLowerCase())
  )

  const toggleTag = (tag: string) => {
    const normalizedTag = tag.toLowerCase()
    const newTags = selectedTags.includes(normalizedTag)
      ? selectedTags.filter(t => t !== normalizedTag)
      : [...selectedTags, normalizedTag]
    
    setTagFilter({ tags: newTags })
    column?.setFilterValue(newTags)
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

  // Add this function to handle scroll events
  function handleScroll(e: React.WheelEvent<HTMLDivElement>) {
    // const target = e.currentTarget;
    // const isAtTop = target.scrollTop === 0;
    // const isAtBottom = target.scrollHeight - target.scrollTop === target.clientHeight;
    
    // // Prevent scroll propagation at boundaries
    // if ((isAtTop && e.deltaY < 0) || (isAtBottom && e.deltaY > 0)) {
    //   e.preventDefault();
    //   e.stopPropagation();
    // }
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

interface TagMetadata {
  name: string
  color: string | null
  description?: string | null
}

interface TradeTableReviewProps {
  trades?: Trade[]
}

export function TradeTableReview({ trades: propTrades }: TradeTableReviewProps) {
  const t = useI18n()
  const { 
    formattedTrades: contextTrades, 
    updateTrade, 
    timezone, 
    tagFilter,
    tags
  } = useUserData()
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null)
  const tradesPerPage = 50

  const trades = propTrades || contextTrades

  // Get unique accounts
  const accounts = useMemo(() => 
    Array.from(new Set(trades.map(t => t.accountNumber))).sort(),
    [trades]
  )

  // Set initial selected account
  useEffect(() => {
    if (!selectedAccount && accounts.length > 0) {
      setSelectedAccount(accounts[0])
    }
  }, [accounts, selectedAccount])

  // Filter trades by selected account
  const filteredTrades = useMemo(() => 
    trades
      .filter(trade => trade.accountNumber === selectedAccount)
      .map(trade => ({
        ...trade,
        direction: trade.side || '',
      }))
      .sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime()),
    [trades, selectedAccount]
  )

  // Calculate total pages
  const totalTrades = filteredTrades.length
  const totalPages = Math.ceil(totalTrades / tradesPerPage)

  // Handle page navigation
  const handlePreviousPage = () => setCurrentPage(prev => Math.max(1, prev - 1))
  const handleNextPage = () => setCurrentPage(prev => Math.min(totalPages, prev + 1))

  // Get paginated trades
  const paginatedTrades = useMemo(() => {
    const startIndex = (currentPage - 1) * tradesPerPage
    const endIndex = startIndex + tradesPerPage
    return filteredTrades.slice(startIndex, endIndex)
  }, [filteredTrades, currentPage, tradesPerPage])

  const handleAddTag = async (tradeId: string, tag: string) => {
    const normalizedTag = tag.trim().toLowerCase()
    if (!normalizedTag) return

    try {
      await addTagToTrade(tradeId, normalizedTag)
      
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

  const handleDeleteTag = useCallback(async (tag: string) => {
    try {
      await deleteTagFromAllTrades(tag)
      
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
  }, [trades, updateTrade])

  const handleImageUpload = useCallback(async (tradeId: string, file: File) => {
    try {
      const base64 = await convertFileToBase64(file)
      await updateTradeImage(tradeId, base64)
      updateTrade(tradeId, { imageBase64: base64 })
    } catch (error) {
      console.error('Failed to upload image:', error)
    }
  }, [updateTrade])

  const handleImagePaste = useCallback(async (tradeId: string, e: ClipboardEvent) => {
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
  }, [handleImageUpload])

  const handleRemoveImage = useCallback(async (tradeId: string) => {
    try {
      await updateTradeImage(tradeId, null)
      updateTrade(tradeId, { imageBase64: null })
    } catch (error) {
      console.error('Failed to remove image:', error)
    }
  }, [updateTrade])

  useEffect(() => {
    const handleGlobalPaste = async (e: ClipboardEvent) => {
      const activeElement = document.activeElement
      if (activeElement?.getAttribute('data-trade-id')) {
        await handleImagePaste(activeElement.getAttribute('data-trade-id')!, e)
      }
    }

    document.addEventListener('paste', handleGlobalPaste)
    return () => document.removeEventListener('paste', handleGlobalPaste)
  }, [handleImagePaste])

  const handleTradeUpdate = useCallback((tradeId: string, updates: Partial<Trade>) => {
    // Only update the context, which will trigger a re-render with the new data
    updateTrade(tradeId, updates)
  }, [updateTrade])

  const handleVideoUrlChange = useCallback((tradeId: string, videoUrl: string | null) => {
    updateTrade(tradeId, { videoUrl })
  }, [updateTrade])

  const handleTagsChange = useCallback((tradeId: string, newTags: string[]) => {
    updateTrade(tradeId, { tags: newTags })
  }, [updateTrade])

  const handleCommentChange = useCallback((tradeId: string, comment: string | null) => {
    updateTrade(tradeId, { comment })
  }, [updateTrade])

  const columns = useMemo<ColumnDef<ExtendedTrade>[]>(() => [
    {
      accessorKey: "entryDate",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hover:bg-transparent px-0 font-medium w-full justify-start"
        >
          {t('trade-table.entryDate')}
          {/* <ArrowUpDown className="ml-2 h-4 w-4" /> */}
        </Button>
      ),
      cell: ({ row }) => formatInTimeZone(new Date(row.getValue("entryDate")), timezone, 'yyyy-MM-dd'),
      sortingFn: (rowA, rowB, columnId) => {
        const a = new Date(rowA.getValue(columnId)).getTime();
        const b = new Date(rowB.getValue(columnId)).getTime();
        return a < b ? -1 : a > b ? 1 : 0;
      },
      size: 120,
    },
    {
      accessorKey: "instrument",
      header: () => (
        <Button
          variant="ghost"
          className="hover:bg-transparent px-0 font-medium w-full justify-start"
        >
          {t('trade-table.instrument')}
        </Button>
      ),
      size: 120,
    },
    {
      accessorKey: "direction",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hover:bg-transparent px-0 font-medium w-full justify-start"
        >
          {t('trade-table.direction')}
          {/* <ArrowUpDown className="ml-2 h-4 w-4" /> */}
        </Button>
      ),
      size: 100,
    },
    {
      accessorKey: "entryPrice",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hover:bg-transparent px-0 font-medium w-full justify-end"
        >
          {t('trade-table.entryPrice')}
          {/* <ArrowUpDown className="ml-2 h-4 w-4" /> */}
        </Button>
      ),
      cell: ({ row }) => {
        const entryPrice = parseFloat(row.getValue("entryPrice"))
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
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hover:bg-transparent px-0 font-medium w-full justify-end"
        >
          {t('trade-table.exitPrice')}
          {/* <ArrowUpDown className="ml-2 h-4 w-4" /> */}
        </Button>
      ),
      cell: ({ row }) => {
        const exitPrice = parseFloat(row.getValue("closePrice"))
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
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hover:bg-transparent px-0 font-medium w-full justify-start"
        >
          {t('trade-table.positionTime')}
          {/* <ArrowUpDown className="ml-2 h-4 w-4" /> */}
        </Button>
      ),
      cell: ({ row }) => {
        const timeInPosition = parseFloat(row.getValue("timeInPosition") as string) || 0
        return <div>{parsePositionTime(timeInPosition)}</div>
      },
      sortingFn: "basic",
      size: 120,
    },
    {
      accessorKey: "entryTime",
      accessorFn: (row) => row.entryDate,
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hover:bg-transparent px-0 font-medium w-full justify-start"
        >
          {t('trade-table.entryTime')}
          {/* <ArrowUpDown className="ml-2 h-4 w-4" /> */}
        </Button>
      ),
      cell: ({ row }) => {
        const dateStr = row.getValue("entryTime") as string
        return <div>{formatInTimeZone(new Date(dateStr), timezone, 'HH:mm:ss')}</div>
      },
      size: 100,
    },
    {
      accessorKey: "closeDate",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hover:bg-transparent px-0 font-medium w-full justify-start"
        >
          {t('trade-table.exitTime')}
          {/* <ArrowUpDown className="ml-2 h-4 w-4" /> */}
        </Button>
      ),
      cell: ({ row }) => {
        const dateStr = row.getValue("closeDate") as string
        return <div>{formatInTimeZone(new Date(dateStr), timezone, 'HH:mm:ss')}</div>
      },
      size: 100,
    },
    {
      accessorKey: "pnl",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hover:bg-transparent px-0 font-medium w-full justify-end"
        >
          {t('trade-table.pnl')}
          {/* <ArrowUpDown className="ml-2 h-4 w-4" /> */}
        </Button>
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
      sortingFn: "basic",
      size: 100,
    },
    {
      accessorKey: "commission",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hover:bg-transparent px-0 font-medium w-full justify-end"
        >
          Commission
          {/* <ArrowUpDown className="ml-2 h-4 w-4" /> */}
        </Button>
      ),
      cell: ({ row }) => {
        const commission = parseFloat(row.getValue("commission"))
        return (
          <div className="text-right font-medium">
            ${commission.toFixed(2)}
          </div>
        )
      },
      // sortingFn: "basic",
      size: 100,
    },
    {
      accessorKey: "quantity",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hover:bg-transparent px-0 font-medium w-full justify-end"
        >
          {t('trade-table.quantity')}
          {/* <ArrowUpDown className="ml-2 h-4 w-4" /> */}
        </Button>
      ),
      cell: ({ row }) => {
        const quantity = parseFloat(row.getValue("quantity"))
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
      accessorKey: "comment",
      header: () => (
        <Button
          variant="ghost"
          className="hover:bg-transparent px-0 font-medium w-full justify-start"
        >
          {t('trade-table.comment')}
        </Button>
      ),
      cell: ({ row }) => {
        const trade = row.original
        return (
          <div className="min-w-[200px]">
            <TradeComment 
              tradeId={trade.id} 
              comment={trade.comment} 
              onCommentChange={(comment) => handleCommentChange(trade.id, comment)}
            />
          </div>
        )
      },
      size: 200,
    },
    {
      accessorKey: "videoUrl",
      header: () => (
        <Button
          variant="ghost"
          className="hover:bg-transparent px-0 font-medium w-full justify-start"
        >
          {t('trade-table.videoUrl')}
        </Button>
      ),
      cell: ({ row }) => {
        const trade = row.original
        return (
          <div className="min-w-[200px]">
            <TradeVideoUrl 
              tradeId={trade.id} 
              videoUrl={trade.videoUrl} 
              onVideoUrlChange={(videoUrl) => handleVideoUrlChange(trade.id, videoUrl)}
            />
          </div>
        )
      },
      size: 200,
    },
    {
      id: "image",
      header: () => (
        <Button
          variant="ghost"
          className="hover:bg-transparent px-0 font-medium w-full justify-start"
        >
          {t('trade-table.image')}
        </Button>
      ),
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
          availableTags={tags.map(t => t.name)}
          onDeleteTag={handleDeleteTag}
        />
      ),
      cell: ({ row }) => {
        const trade = row.original
        return (
          <div className="min-w-[200px]">
            <TradeTag
              tradeId={trade.id}
              tags={trade.tags || []}
              availableTags={tags}
              onTagsChange={(newTags) => handleTagsChange(trade.id, newTags)}
            />
          </div>
        )
      },
      filterFn: (row, id, filterValue: string[]) => {
        if (!filterValue?.length) return true
        const tradeTags = row.original.tags.map(tag => tag.toLowerCase())
        return filterValue.some(tag => tradeTags.includes(tag.toLowerCase()))
      },
      size: 200,
    }
  ], [t, timezone, handleTagsChange, handleCommentChange, handleVideoUrlChange, tags, handleDeleteTag, handleImagePaste, handleImageUpload, handleRemoveImage])

  const table = useReactTable<ExtendedTrade>({
    data: paginatedTrades,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnFiltersChange: setColumnFilters,
    onSortingChange: setSorting,
    state: {
      columnFilters,
      sorting,
    },
    enableSorting: true,
    defaultColumn: {
      minSize: 80,
      size: 100,
      maxSize: 400,
    },
    columnResizeMode: "onChange",
  })

  // Add a debug log to check sorting state
  useEffect(() => {
    console.log('Current sorting state:', sorting);
  }, [sorting]);

  return (
    <div className="flex flex-col h-full w-full border rounded-md overflow-hidden">
      <div className="flex items-center justify-between p-2 border-b bg-background">
        <div className="flex gap-2 items-center">
          <span className="text-sm font-medium">{t('trade-table.account')}:</span>
          <select
            className="h-8 w-48 rounded-md border border-input bg-background px-3 text-sm"
            value={selectedAccount || ''}
            onChange={(e) => {
              setSelectedAccount(e.target.value)
              setCurrentPage(1) // Reset to first page when changing account
            }}
          >
            {accounts.map(account => (
              <option key={account} value={account}>
                {account}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreviousPage}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            {t('trade-table.previous')}
          </Button>
          <span className="text-sm">
            {t('trade-table.pageInfo', { current: currentPage, total: totalPages })}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
          >
            {t('trade-table.next')}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <table className="w-full border-separate border-spacing-0">
          <thead className="sticky top-0 z-30 bg-background">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="h-12 px-4 text-left align-middle border-b bg-background whitespace-nowrap"
                    style={{
                      width: header.getSize(),
                      maxWidth: header.getSize(),
                    }}
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
            {paginatedTrades.map((trade) => {
              const row = table.getRowModel().rows.find(r => r.original.id === trade.id)
              if (!row) return null
              
              return (
                <tr key={trade.id}>
                  {row.getAllCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="px-4 py-2 border-b whitespace-nowrap align-middle bg-background"
                      style={{
                        width: cell.column.getSize(),
                        maxWidth: cell.column.getSize(),
                      }}
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
            {paginatedTrades.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length}
                  className="h-24 text-center align-middle text-muted-foreground"
                >
                  {t('trade-table.noResults')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between p-4 border-t bg-background">
        <div className="text-sm text-muted-foreground">
          {t('trade-table.totalTrades', { count: totalTrades })}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreviousPage}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            {t('trade-table.previous')}
          </Button>
          <span className="text-sm">
            {t('trade-table.pageInfo', { current: currentPage, total: totalPages })}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
          >
            {t('trade-table.next')}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
