'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Download, CalendarIcon } from 'lucide-react'
import { Trade } from '@/prisma/generated/prisma/browser'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Calendar } from "@/components/ui/calendar"
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths } from "date-fns"
import { DateRange } from "react-day-picker"
import { cn, generateTradeHash } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

type Props = {
  trades: Trade[]
}

interface FilteredTrade extends Trade {
  formattedEntryDate: string;
  formattedCloseDate: string;
}

export default function TradeExportDialog({ trades }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const accounts = Array.from(new Set(trades.map(trade => trade.accountNumber)))
  const instruments = Array.from(new Set(trades.map(trade => trade.instrument.slice(0, 2))))

  const [selectedAccounts, setSelectedAccounts] = useState<string[]>(accounts)
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>(instruments)
  const [selectAllAccounts, setSelectAllAccounts] = useState(true)
  const [selectAllInstruments, setSelectAllInstruments] = useState(true)
  
  const [dateRange, setDateRange] = useState<DateRange>({ 
    from: subMonths(new Date(), 6), 
    to: new Date() 
  })
  
  const [currentPage, setCurrentPage] = useState(1)
  const [filteredTrades, setFilteredTrades] = useState<FilteredTrade[]>([])
  const itemsPerPage = 10

  const quickSelectors = [
    { label: "This Week", getRange: () => ({ from: startOfWeek(new Date()), to: endOfWeek(new Date()) }) },
    { label: "This Month", getRange: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
    { label: "Last 3 Months", getRange: () => ({ from: subMonths(new Date(), 3), to: new Date() }) },
    { label: "Last 6 Months", getRange: () => ({ from: subMonths(new Date(), 6), to: new Date() }) },
  ]

  const handleExport = () => {
    // Filter trades based on selected accounts, instruments, and date range
    const filteredTrades = trades.filter(trade => 
      selectedAccounts.includes(trade.accountNumber) &&
      selectedInstruments.includes(trade.instrument.slice(0, 2)) &&
      (!dateRange?.from || new Date(trade.entryDate) >= dateRange.from) &&
      (!dateRange?.to || new Date(trade.entryDate) <= dateRange.to)
    )

    // Define CSV headers
    const headers = [
      'Account Number', 'Quantity', 'Instrument',
      'Entry Price', 'Close Price', 'Entry Date', 'Close Date', 'PNL',
      'Time in Position', 'Side', 'Commission', 'Comment', 'Video URL', 'Tags'
    ]

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...filteredTrades.map((trade: Trade) => [
        trade.accountNumber,
        trade.quantity,
        trade.instrument,
        trade.entryPrice,
        trade.closePrice,
        trade.entryDate,
        trade.closeDate,
        trade.pnl,
        trade.timeInPosition,
        trade.side,
        trade.commission,
        trade.videoUrl,
        trade.tags.join(','),
        `"${trade.comment || ''}"`  // Wrap comment in quotes to handle potential commas
      ].join(','))
    ].join('\n')

    // Create a Blob with the CSV content
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })

    // Create a download link and trigger the download
    const link = document.createElement('a')
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `trades_export_${new Date().toISOString().slice(0, 10)}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }

    setIsOpen(false)
  }

  const handleAccountChange = (account: string) => {
    setSelectedAccounts(prev => 
      prev.includes(account) ? prev.filter(a => a !== account) : [...prev, account]
    )
  }

  const handleInstrumentChange = (instrument: string) => {
    setSelectedInstruments(prev => 
      prev.includes(instrument) ? prev.filter(i => i !== instrument) : [...prev, instrument]
    )
  }

  const handleSelectAllAccounts = () => {
    setSelectAllAccounts(!selectAllAccounts)
    setSelectedAccounts(selectAllAccounts ? [] : accounts)
  }

  const handleSelectAllInstruments = () => {
    setSelectAllInstruments(!selectAllInstruments)
    setSelectedInstruments(selectAllInstruments ? [] : instruments)
  }

  const updateFilteredTrades = useCallback(() => {
    const filtered = trades.filter(trade => 
      selectedAccounts.includes(trade.accountNumber) &&
      selectedInstruments.includes(trade.instrument.slice(0, 2)) &&
      (!dateRange?.from || new Date(trade.entryDate) >= dateRange.from) &&
      (!dateRange?.to || new Date(trade.entryDate) <= dateRange.to)
    ).map(trade => ({
      ...trade,
      formattedEntryDate: format(new Date(trade.entryDate), 'yyyy-MM-dd HH:mm'),
      formattedCloseDate: format(new Date(trade.closeDate), 'yyyy-MM-dd HH:mm')
    }))
    setFilteredTrades(filtered)
  }, [selectedAccounts, selectedInstruments, dateRange, trades])

  useEffect(() => {
    updateFilteredTrades()
  }, [updateFilteredTrades])

  const totalPages = Math.ceil(filteredTrades.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentTrades = filteredTrades.slice(startIndex, endIndex)

  const handleDateRangeSelect = (range: DateRange | undefined) => {
    if (range) {
      setDateRange(range)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Download className="mr-2 h-4 w-4" /> Export Trades
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-full h-[90vh] w-full flex flex-col">
        <DialogHeader>
          <DialogTitle>Export Trades</DialogTitle>
          <DialogDescription>
            Select the accounts, instruments, and date range you want to export.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-4">
            <Card className="w-full h-fit">
              <CardHeader>
                <CardTitle className="text-base">Select Data</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label className="text-base">Select Accounts</Label>
                    <div className="flex items-center space-x-2 mt-2">
                      <Checkbox 
                        id="selectAllAccounts" 
                        checked={selectAllAccounts} 
                        onCheckedChange={handleSelectAllAccounts}
                      />
                      <label htmlFor="selectAllAccounts" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Select All
                      </label>
                    </div>
                    <ScrollArea className="h-[100px] mt-2 rounded border p-2">
                      {accounts.map(account => (
                        <div key={account} className="flex items-center space-x-2 mb-2">
                          <Checkbox 
                            id={`account-${account}`} 
                            checked={selectedAccounts.includes(account)}
                            onCheckedChange={() => handleAccountChange(account)}
                          />
                          <label htmlFor={`account-${account}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            {account}
                          </label>
                        </div>
                      ))}
                    </ScrollArea>
                  </div>
                  <div>
                    <Label className="text-base">Select Instruments</Label>
                    <div className="flex items-center space-x-2 mt-2">
                      <Checkbox 
                        id="selectAllInstruments" 
                        checked={selectAllInstruments} 
                        onCheckedChange={handleSelectAllInstruments}
                      />
                      <label htmlFor="selectAllInstruments" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Select All
                      </label>
                    </div>
                    <ScrollArea className="h-[100px] mt-2 rounded border p-2">
                      {instruments.map(instrument => (
                        <div key={instrument} className="flex items-center space-x-2 mb-2">
                          <Checkbox 
                            id={`instrument-${instrument}`} 
                            checked={selectedInstruments.includes(instrument)}
                            onCheckedChange={() => handleInstrumentChange(instrument)}
                          />
                          <label htmlFor={`instrument-${instrument}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            {instrument}
                          </label>
                        </div>
                      ))}
                    </ScrollArea>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="w-full h-fit">
              <CardHeader>
                <CardTitle className="text-base">Select Date Range</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {quickSelectors.map((selector, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        className="w-full"
                        onClick={() => setDateRange(selector.getRange())}
                      >
                        {selector.label}
                      </Button>
                    ))}
                  </div>
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={handleDateRangeSelect}
                    numberOfMonths={2}
                    className="rounded-md border"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="mt-6 px-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Preview ({filteredTrades.length} trades)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Account</TableHead>
                        <TableHead>Instrument</TableHead>
                        <TableHead>Side</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Entry Date</TableHead>
                        <TableHead>Close Date</TableHead>
                        <TableHead className="text-right">Commission</TableHead>
                        <TableHead className="text-right">PNL</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentTrades.map((trade) => (
                        <TableRow key={generateTradeHash(trade)}>
                          <TableCell>{trade.accountNumber}</TableCell>
                          <TableCell>{trade.instrument}</TableCell>
                          <TableCell>{trade.side}</TableCell>
                          <TableCell>{trade.quantity}</TableCell>
                          <TableCell>{trade.formattedEntryDate}</TableCell>
                          <TableCell>{trade.formattedCloseDate}</TableCell>
                          <TableCell className="text-right">
                            {trade.commission?.toFixed(2) || '0.00'}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={trade.pnl >= 0 ? "text-green-500" : "text-red-500"}>
                              {trade.pnl.toFixed(2)}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                
                <div className="mt-4">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        />
                      </PaginationItem>
                      
                      {[...Array(totalPages)].map((_, i) => {
                        const page = i + 1
                        // Show first page, last page, current page, and pages around current
                        if (
                          page === 1 ||
                          page === totalPages ||
                          (page >= currentPage - 1 && page <= currentPage + 1)
                        ) {
                          return (
                            <PaginationItem key={page}>
                              <PaginationLink
                                onClick={() => setCurrentPage(page)}
                                isActive={currentPage === page}
                              >
                                {page}
                              </PaginationLink>
                            </PaginationItem>
                          )
                        } else if (
                          page === currentPage - 2 ||
                          page === currentPage + 2
                        ) {
                          return <PaginationEllipsis key={page} />
                        }
                        return null
                      })}
                      
                      <PaginationItem>
                        <PaginationNext
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        <div className="p-4 bg-background border-t mt-auto">
          <Button 
            onClick={handleExport} 
            disabled={selectedAccounts.length === 0 || selectedInstruments.length === 0}
            className="w-full max-w-xl mx-auto"
          >
            <Download className="mr-2 h-4 w-4" /> Export {filteredTrades.length} Trades
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}