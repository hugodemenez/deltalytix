'use client'

import { useState, useMemo } from 'react'
import { useFormattedTrades, useTrades } from "../context/trades-data"
import { Trade } from '@prisma/client'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowUpDown, Trash } from "lucide-react"
import { saveTrades } from '@/server/database'
import { useToast } from "@/hooks/use-toast"
import { deleteTradesByIds } from '@/app/[locale]/(dashboard)/dashboard/data/actions'

type SortConfig = {
  key: keyof Trade
  direction: 'asc' | 'desc'
}

export default function TradeTable() {
  const { formattedTrades } = useFormattedTrades()
  const { refreshTrades } = useTrades()
  const [filterValue, setFilterValue] = useState('')
  const [filterKey, setFilterKey] = useState<keyof Trade>('instrument')
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'entryDate', direction: 'desc' })
  const [selectedTrades, setSelectedTrades] = useState<Set<string>>(new Set())
  const { toast } = useToast()
  const [selectAll, setSelectAll] = useState(false)

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

  const handleSort = (key: keyof Trade) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  const handleDelete = async (ids: string[]) => {
    await deleteTradesByIds(ids)
    setSelectedTrades(new Set())
    refreshTrades()
    toast({
      title: "Trades Deleted",
      description: `${ids.length} trade(s) have been deleted.`,
    })
  }

  const handleAddTrade = async (newTrade: Partial<Trade>) => {
    await saveTrades([newTrade as Trade])
    refreshTrades()
    toast({
      title: "Trade Added",
      description: "A new trade has been added successfully.",
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
          {filteredAndSortedTrades.map((trade) => (
            <TableRow key={trade.id}>
              <TableCell>
                <Checkbox
                  checked={selectedTrades.has(trade.id)}
                  onCheckedChange={() => toggleTradeSelection(trade.id)}
                />
              </TableCell>
              <TableCell>{trade.instrument}</TableCell>
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
    </div>
  )
}