'use client'

import { useState, useEffect, useMemo } from 'react'
import { useFormattedTrades, useTrades } from '@/components/context/trades-data'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  SortingState,
  getSortedRowModel,
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
import { cn } from '@/lib/utils'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"

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
            placeholder="Type a tag..." 
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
                Add tag &ldquo;{inputValue.trim()}&rdquo;
              </CommandItem>
            )}
            {availableTags.length > 0 && (
              <CommandGroup heading="Existing Tags">
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
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

interface TagFilterProps {
  availableTags: string[]
  onDeleteTag: (tag: string) => Promise<void>
}

function TagFilter({ availableTags, onDeleteTag }: TagFilterProps) {
  const [search, setSearch] = useState('')

  const filteredTags = availableTags.filter(tag => 
    tag.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="h-8 group hover:bg-muted"
        >
          Tags
          <Search className="ml-2 h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <Command>
          <CommandInput 
            placeholder="Search tags..." 
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>No tags found</CommandEmpty>
            {filteredTags.length > 0 && (
              <CommandGroup>
                {filteredTags.map(tag => (
                  <CommandItem
                    key={tag}
                    className="flex items-center justify-between"
                  >
                    <span>{tag}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 hover:bg-destructive hover:text-destructive-foreground"
                      onClick={(e) => {
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

export function TradeTableReview() {
  const { formattedTrades } = useFormattedTrades()
  const { updateTrade } = useTrades()
  const [sorting, setSorting] = useState<SortingState>([])
  const [availableTags, setAvailableTags] = useState<string[]>([])

  // Initialize available tags from all trades with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      const allTags = new Set<string>()
      formattedTrades.forEach(trade => {
        trade.tags?.forEach(tag => allTags.add(tag))
      })
      setAvailableTags(Array.from(allTags))
    }, 100) // Small delay to prevent rapid updates

    return () => clearTimeout(timer)
  }, [formattedTrades])

  const handleAddTag = async (tradeId: string, tag: string) => {
    const normalizedTag = tag.trim().toLowerCase()
    if (!normalizedTag) return

    try {
      // Update the database first
      await addTagToTrade(tradeId, normalizedTag)
      
      // Then update UI state
      if (!availableTags.includes(normalizedTag)) {
        setAvailableTags(prev => [...prev, normalizedTag])
      }

      // Update the trade in context
      const trade = formattedTrades.find(t => t.id === tradeId)
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
      
      // Update the trade in context
      const trade = formattedTrades.find(t => t.id === tradeId)
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
      
      // Update all trades that had this tag
      formattedTrades
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
      // Update the trade in context
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
      // Update the trade in context
      updateTrade(tradeId, { imageBase64: null })
    } catch (error) {
      console.error('Failed to remove image:', error)
    }
  }

  useEffect(() => {
    // Add paste event listener to the document
    const handleGlobalPaste = async (e: ClipboardEvent) => {
      const activeElement = document.activeElement
      if (activeElement?.getAttribute('data-trade-id')) {
        await handleImagePaste(activeElement.getAttribute('data-trade-id')!, e)
      }
    }

    document.addEventListener('paste', handleGlobalPaste)
    return () => document.removeEventListener('paste', handleGlobalPaste)
  }, [])

  const columns: ColumnDef<ExtendedTrade>[] = [
    {
      accessorKey: "entryDate",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Entry Date
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => new Date(row.getValue("entryDate")).toLocaleDateString(),
    },
    {
      accessorKey: "instrument",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Instrument
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
    },
    {
      accessorKey: "direction",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Direction
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
    },
    {
      accessorKey: "pnl",
      header: ({ column }) => {
        return (
          <div className="text-right">
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
              PnL
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )
      },
      cell: ({ row }) => {
        const pnl = parseFloat(row.getValue("pnl"))
        return (
          <div className="text-right">
            <span className={pnl >= 0 ? 'text-green-600' : 'text-red-600'}>
              {pnl.toFixed(2)}
            </span>
          </div>
        )
      },
    },
    {
      id: "image",
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
      header: "Image",
    },
    {
      id: "tags",
      header: () => (
        <TagFilter 
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
      }
    }
  ]

  // Memoize the table data
  const tableData = useMemo(() => 
    formattedTrades.map(trade => ({
      ...trade,
      imageUrl: undefined,
      direction: trade.side as string,
      tags: trade.tags || [],
    })), [formattedTrades]
  )

  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  })

  return (
    <div className="flex flex-col h-full rounded-md border">
      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full">
          <div className="min-w-max">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
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
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      No results.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </ScrollArea>
      </div>

      <div className="flex items-center justify-between p-2 border-t">
        <div className="text-sm text-muted-foreground">
          Page {table.getState().pagination.pageIndex + 1} of{" "}
          {table.getPageCount()}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
