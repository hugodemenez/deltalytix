// FilterSelectors.tsx
import React from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Trade } from '@prisma/client'
import AiImportButton from './ai-import-button'

interface FilterSelectorsProps {
  accountNumber: string
  setAccountNumber: (value: string) => void
  instrument: string
  setInstrument: (value: string) => void
  trades: Trade[]
}

export function FilterSelectors({ accountNumber, setAccountNumber, instrument, setInstrument, trades }: FilterSelectorsProps) {
  const uniqueAccounts = Array.from(new Set(trades.map(trade => trade.accountNumber)))
  const uniqueInstruments = Array.from(new Set(trades.map(trade => trade.instrument)))

  return (
    <div className='grid grid-cols-1 sm:grid-cols-3 gap-x-4'>
      <Select value={accountNumber} onValueChange={setAccountNumber}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select account" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Accounts</SelectItem>
          {uniqueAccounts.map((account) => (
            <SelectItem key={account} value={account}>{account}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={instrument} onValueChange={setInstrument}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select instrument" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Instruments</SelectItem>
          {uniqueInstruments.map((inst) => (
            <SelectItem key={inst} value={inst}>{inst}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <AiImportButton />
    </div>
  )
}