"use client"

import { useState, useEffect } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { CommandItem } from "@/components/ui/command"
import { useI18n } from "@/locales/client"
import { useData } from "@/context/data-provider"
import { useTradesStore } from "../../../../../store/trades-store"

interface InstrumentSectionProps {
  searchValue: string
}

export function InstrumentSection({ searchValue }: InstrumentSectionProps) {
  const { instruments = [], setInstruments } = useData()
  const trades = useTradesStore(state => state.trades)
  const t = useI18n()
  const [availableInstruments, setAvailableInstruments] = useState<string[]>([])

  useEffect(() => {
    if (trades && trades.length > 0) {
      const uniqueInstruments = Array.from(
        new Set(trades.map(trade => trade.instrument || '').filter(Boolean))
      )
      setAvailableInstruments(uniqueInstruments)
    }
  }, [trades])

  // Filter instruments based on search term
  const filteredInstruments = searchValue
    ? availableInstruments.filter(instrument =>
        instrument.toLowerCase().includes(searchValue.toLowerCase())
      )
    : availableInstruments

  const handleSelectAll = () => {
    const allSelected = availableInstruments.every(instrument =>
      instruments.includes(instrument)
    )
    
    setInstruments(prev =>
      allSelected ? [] : [...availableInstruments]
    )
  }

  const handleSelect = (instrument: string) => {
    setInstruments(prev =>
      prev.includes(instrument)
        ? prev.filter(i => i !== instrument)
        : [...prev, instrument]
    )
  }

  const isItemSelected = (instrument: string): boolean => {
    return instruments.includes(instrument)
  }

  const allSelected = availableInstruments.length > 0 && 
    availableInstruments.every(instrument => isItemSelected(instrument))

  return (
    <>
      <CommandItem
        onSelect={handleSelectAll}
        className="flex items-center gap-2 px-2 bg-muted/50"
      >
        <Checkbox
          checked={allSelected}
          className="h-4 w-4"
        />
        <span className="text-sm font-medium">{t('filters.selectAllInstruments')}</span>
      </CommandItem>

      {filteredInstruments.map(instrument => (
        <CommandItem
          key={instrument}
          onSelect={() => handleSelect(instrument)}
          className="flex items-center gap-2 pl-6"
        >
          <Checkbox
            checked={isItemSelected(instrument)}
            className="h-4 w-4 shrink-0"
          />
          <span className="text-sm break-all pr-2">
            {instrument}
          </span>
        </CommandItem>
      ))}

      {filteredInstruments.length === 0 && availableInstruments.length > 0 && (
        <CommandItem disabled className="text-sm text-muted-foreground px-2">
          {t('filters.noInstrumentFound')}
        </CommandItem>
      )}
    </>
  )
}

