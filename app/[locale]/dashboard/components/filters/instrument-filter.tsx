"use client"

import { useData } from "@/context/data-provider"
import { useI18n } from "@/locales/client"
import { useState, useEffect } from "react"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { useTradesStore } from "../../../../../store/trades-store"

export function InstrumentFilter() {
  const t = useI18n()
  const { instruments, setInstruments } = useData()
  const trades = useTradesStore(state => state.trades)
  const [searchTerm, setSearchTerm] = useState("")
  const [availableInstruments, setAvailableInstruments] = useState<string[]>([])

  useEffect(() => {
    if (trades && trades.length > 0) {
      const uniqueInstruments = Array.from(new Set(trades.map(trade => trade.instrument || '')))
      setAvailableInstruments(uniqueInstruments)
    }
  }, [trades])

  const handleInstrumentToggle = (instrument: string) => {
    setInstruments(prev => {
      if (prev.includes(instrument)) {
        return prev.filter(i => i !== instrument)
      }
      return [...prev, instrument]
    })
  }

  const filteredInstruments = availableInstruments.filter(instrument =>
    instrument.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="p-2 space-y-2">
      <Input
        placeholder={t('filters.searchInstrument')}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full"
      />
      <ScrollArea className="h-[200px]">
        {filteredInstruments.map((instrument) => (
          <DropdownMenuItem
            key={instrument}
            onSelect={(e) => {
              e.preventDefault()
              handleInstrumentToggle(instrument)
            }}
            className="flex items-center gap-2"
          >
            <Checkbox
              checked={instruments?.includes(instrument)}
              className="mr-2"
            />
            {instrument}
          </DropdownMenuItem>
        ))}
      </ScrollArea>
    </div>
  )
} 