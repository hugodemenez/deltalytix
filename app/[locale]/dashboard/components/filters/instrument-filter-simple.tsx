"use client"

import { useData } from "@/context/data-provider"
import { useI18n } from "@/locales/client"
import { useState, useEffect } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Search } from "lucide-react"
import { useTradesStore } from "../../../../../store/trades-store"

interface InstrumentFilterSimpleProps {
  className?: string
}

export function InstrumentFilterSimple({ className }: InstrumentFilterSimpleProps) {
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

  const handleSelect = (instrument: string) => {
    setInstruments(prev => {
      if (prev.includes(instrument)) {
        return prev.filter(i => i !== instrument)
      }
      return [...prev, instrument]
    })
  }

  const handleSelectAll = () => {
    const allSelected = availableInstruments.every(instrument => instruments.includes(instrument))
    
    setInstruments(allSelected ? [] : availableInstruments)
  }

  const isItemSelected = (instrument: string) => {
    return instruments.includes(instrument)
  }

  const filteredInstruments = availableInstruments.filter(instrument =>
    instrument.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{t('filters.instruments')}</Label>
      <Command className="rounded-lg border" shouldFilter={false}>
        <div className="border-b">
          <div className="flex items-center gap-2 px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('filters.searchInstrument')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 h-8"
            />
          </div>
        </div>
        <CommandList>
          <ScrollArea className="h-[200px]">
            <CommandGroup>
              <CommandItem
                onSelect={handleSelectAll}
                className="flex items-center gap-2 px-2 bg-muted/50"
              >
                <Checkbox
                  checked={availableInstruments.length > 0 && availableInstruments.every(instrument => isItemSelected(instrument))}
                  className="h-4 w-4"
                />
                <span className="text-sm font-medium">{t('filters.selectAllInstruments')}</span>
              </CommandItem>
              
              {filteredInstruments.map((instrument) => (
                <CommandItem
                  key={instrument}
                  onSelect={() => handleSelect(instrument)}
                  className="flex items-center gap-2 px-2"
                >
                  <Checkbox
                    checked={isItemSelected(instrument)}
                    className="h-4 w-4"
                  />
                  <span className="text-sm">{instrument}</span>
                </CommandItem>
              ))}
              
              {filteredInstruments.length === 0 && (
                <CommandEmpty>
                  {searchTerm ? t('filters.noInstrumentFound') : t('filters.noResults')}
                </CommandEmpty>
              )}
            </CommandGroup>
          </ScrollArea>
        </CommandList>
      </Command>
    </div>
  )
} 