'use client'

import { useState, useMemo } from 'react'
import { Trade } from '@/prisma/generated/prisma/client'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowUpDown, Trash, ChevronLeft, ChevronRight } from "lucide-react"
import { saveTradesAction } from '@/server/database'
import { toast } from 'sonner'
import { deleteTradesByIdsAction } from '@/server/accounts'
import { useData } from '@/context/data-provider'

type SortConfig = {
  key: keyof Trade
  direction: 'asc' | 'desc'
}

export default function TradeTable() {
  const { refreshTrades, formattedTrades } = useData()
  const [filterValue, setFilterValue] = useState('')
  const [filterKey, setFilterKey] = useState<keyof Trade>('instrument')
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'entryDate', direction: 'desc' })
  const [selectedTrades, setSelectedTrades] = useState<Set<string>>(new Set())
  const [selectAll, setSelectAll] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const tradesPerPage = 10

  const filteredAndSortedTrades = useMemo(() => {
    return formattedTrades
      .filter(trade => 
        String(trade[filterKey] ?? '').toLowerCase().includes(filterValue.toLowerCase())
      )
      .sort((a, b) => {
        const aValue = a[sortConfig.key]
        const bValue = b[sortConfig.key]
        if (aValue == null && bValue == null) return 0
        if (aValue == null) return sortConfig.direction === 'asc' ? 1 : -1
        if (bValue == null) return sortConfig.direction === 'asc' ? -1 : 1
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
  }, [formattedTrades, filterValue, filterKey, sortConfig])

  const paginatedTrades = useMemo(() => {
    const startIndex = (currentPage - 1) * tradesPerPage
    return filteredAndSortedTrades.slice(startIndex, startIndex + tradesPerPage)
  }, [filteredAndSortedTrades, currentPage])

  const totalPages = Math.ceil(filteredAndSortedTrades.length / tradesPerPage)

  const handleSort = (key: keyof Trade) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  const handleDelete = async (ids: string[]) => {
    await deleteTradesByIdsAction(ids)
    setSelectedTrades(new Set())
    refreshTrades()
    toast.message( "Trades Deleted", {
      description: `${ids.length} trade(s) have been deleted.`,
    })
  }

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedTrades(new Set())
    } else {
      const allTradeIds = new Set(filteredAndSortedTrades.map(trade => trade.id))
      setSelectedTrades(allTradeIds)
    }
    setSelectAll(!selectAll)
  }

  const toggleTradeSelection = (id: string) => {
    const newSelected = new Set(selectedTrades)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedTrades(newSelected)
    setSelectAll(newSelected.size === filteredAndSortedTrades.length)
  }

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1))
  }

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex space-x-2">
          <Select value={filterKey} onValueChange={(value) => setFilterKey(value as keyof Trade)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="instrument">Instrument</SelectItem>
              <SelectItem value="side">Side</SelectItem>
              <SelectItem value="accountNumber">Account Number</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder={`Filter by ${filterKey}`}
            value={filterValue}
            onChange={(e) => setFilterValue(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <div className="space-x-2">
          <Button onClick={() => handleDelete(Array.from(selectedTrades))} disabled={selectedTrades.size === 0}>
            <Trash className="mr-2 h-4 w-4" /> Delete Selected
          </Button>
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">
              <Checkbox
                checked={selectAll}
                onCheckedChange={toggleSelectAll}
                aria-label="Select all"
              />
            </TableHead>
            <TableHead className="w-[100px]">
              <Button variant="ghost" onClick={() => handleSort('instrument')}>
                Instrument
                {sortConfig.key === 'instrument' && <ArrowUpDown className="ml-2 h-4 w-4" />}
              </Button>
            </TableHead>
            <TableHead>
              <Button variant="ghost" onClick={() => handleSort('accountNumber')}>
                Account
                {sortConfig.key === 'accountNumber' && <ArrowUpDown className="ml-2 h-4 w-4" />}
              </Button>
            </TableHead>
            <TableHead>
              <Button variant="ghost" onClick={() => handleSort('side')}>
                Side
                {sortConfig.key === 'side' && <ArrowUpDown className="ml-2 h-4 w-4" />}
              </Button>
            </TableHead>
            <TableHead>
              <Button variant="ghost" onClick={() => handleSort('quantity')}>
                Quantity
                {sortConfig.key === 'quantity' && <ArrowUpDown className="ml-2 h-4 w-4" />}
              </Button>
            </TableHead>
            <TableHead>
              <Button variant="ghost" onClick={() => handleSort('entryPrice')}>
                Entry Price
                {sortConfig.key === 'entryPrice' && <ArrowUpDown className="ml-2 h-4 w-4" />}
              </Button>
            </TableHead>
            <TableHead>
              <Button variant="ghost" onClick={() => handleSort('closePrice')}>
                Close Price
                {sortConfig.key === 'closePrice' && <ArrowUpDown className="ml-2 h-4 w-4" />}
              </Button>
            </TableHead>
            <TableHead>
              <Button variant="ghost" onClick={() => handleSort('entryDate')}>
                Entry Date
                {sortConfig.key === 'entryDate' && <ArrowUpDown className="ml-2 h-4 w-4" />}
              </Button>
            </TableHead>
            <TableHead>
              <Button variant="ghost" onClick={() => handleSort('closeDate')}>
                Close Date
                {sortConfig.key === 'closeDate' && <ArrowUpDown className="ml-2 h-4 w-4" />}
              </Button>
            </TableHead>
            <TableHead>
              <Button variant="ghost" onClick={() => handleSort('pnl')}>
                PNL
                {sortConfig.key === 'pnl' && <ArrowUpDown className="ml-2 h-4 w-4" />}
              </Button>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedTrades.map((trade) => (
            <TableRow key={trade.id}>
              <TableCell>
                <Checkbox
                  checked={selectedTrades.has(trade.id)}
                  onCheckedChange={() => toggleTradeSelection(trade.id)}
                />
              </TableCell>
              <TableCell>{trade.instrument}</TableCell>
              <TableCell>{trade.accountNumber}</TableCell>
              <TableCell>{trade.side}</TableCell>
              <TableCell>{trade.quantity}</TableCell>
              <TableCell>{trade.entryPrice}</TableCell>
              <TableCell>{trade.closePrice}</TableCell>
              <TableCell>{new Date(trade.entryDate).toLocaleString()}</TableCell>
              <TableCell>{new Date(trade.closeDate).toLocaleString()}</TableCell>
              <TableCell>{trade.pnl.toFixed(2)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Showing {((currentPage - 1) * tradesPerPage) + 1} to {Math.min(currentPage * tradesPerPage, filteredAndSortedTrades.length)} of {filteredAndSortedTrades.length} trades
        </p>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreviousPage}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <span className="text-sm">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
