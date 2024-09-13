'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Download } from 'lucide-react'
import { Trade } from '@prisma/client'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"

type Props = {
  trades: Trade[]
}

export default function TradeExportDialog({ trades }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([])
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>([])
  const [selectAllAccounts, setSelectAllAccounts] = useState(false)
  const [selectAllInstruments, setSelectAllInstruments] = useState(false)

  const accounts = Array.from(new Set(trades.map(trade => trade.accountNumber)))
  const instruments = Array.from(new Set(trades.map(trade => trade.instrument.slice(0, 2))))

  const handleExport = () => {
    // Filter trades based on selected accounts and instruments
    const filteredTrades = trades.filter(trade => 
      selectedAccounts.includes(trade.accountNumber) &&
      selectedInstruments.includes(trade.instrument.slice(0, 2))
    )

    // Define CSV headers
    const headers = [
      'Account Number', 'Quantity', 'Entry ID', 'Close ID', 'Instrument',
      'Entry Price', 'Close Price', 'Entry Date', 'Close Date', 'PNL',
      'Time in Position', 'User ID', 'Side', 'Commission', 'Created At', 'Comment'
    ]

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...filteredTrades.map((trade: Trade) => [
        trade.accountNumber,
        trade.quantity,
        trade.entryId,
        trade.closeId,
        trade.instrument,
        trade.entryPrice,
        trade.closePrice,
        trade.entryDate,
        trade.closeDate,
        trade.pnl,
        trade.timeInPosition,
        trade.userId,
        trade.side,
        trade.commission,
        trade.createdAt.toISOString(),
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

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
                size="sm"
        >
          <Download className="mr-2 h-4 w-4" /> Export Trades
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Export Trades</DialogTitle>
          <DialogDescription>
            Select the accounts and instruments you want to export.
          </DialogDescription>
        </DialogHeader>
        <Card className="w-full mx-auto">
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
          <CardFooter>
            <Button 
              onClick={handleExport} 
              disabled={selectedAccounts.length === 0 || selectedInstruments.length === 0}
              className="w-full"
            >
              <Download className="mr-2 h-4 w-4" /> Export to CSV
            </Button>
          </CardFooter>
        </Card>
      </DialogContent>
    </Dialog>
  )
}