'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Filter } from "lucide-react"
import { useMediaQuery } from '@/hooks/use-media-query'
import { Switch } from "@/components/ui/switch"
import DateCalendarFilter from './date-calendar-filter'
import { useData } from '@/context/data-provider'
import { AccountFilter } from './account-filter'
import { InstrumentFilterSimple } from './instrument-filter-simple'
import { PnlFilterSimple } from './pnl-filter-simple'
import { TagFilter } from './tag-filter'
import { useI18n } from "@/locales/client"

export default function FilterLeftPane() {
  const { accountNumbers, setAccountNumbers, instruments, setInstruments } = useData()
  const t = useI18n()
  
  const [isOpen, setIsOpen] = useState(false)
  const [showAccountNumbers, setShowAccountNumbers] = useState(true)
  const isMobile = useMediaQuery("(max-width: 768px)")

  const FilterContent = useMemo(() => (
    <div className='space-y-6'>
      {/* Date Calendar Filter */}
      <DateCalendarFilter />
      
      {/* Account Numbers Toggle */}
      <div className="flex items-center justify-between">
        <Label htmlFor="anonymous-mode" className="text-sm font-medium">
          {t('filters.showAccountNumbers')}
        </Label>
        <Switch
          id="anonymous-mode"
          checked={showAccountNumbers}
          onCheckedChange={setShowAccountNumbers}
        />
      </div>
      
      {/* Account Filter */}
      <AccountFilter 
        showAccountNumbers={showAccountNumbers}
      />

      {/* Instrument Filter */}
      <InstrumentFilterSimple />

      {/* PnL Filter */}
      <PnlFilterSimple />

      {/* Tag Filter */}
      <TagFilter />
    </div>
  ), [showAccountNumbers, t])

  if (isMobile) {
    return (
      <>
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              className="h-10 w-10 p-0 rounded-full flex items-center justify-center transition-transform active:scale-95"
            >
              <Filter className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[90vw] sm:max-w-[640px] flex flex-col h-[100dvh] overflow-hidden">
            <SheetHeader>
              <SheetTitle>{t('filters.title')}</SheetTitle>
            </SheetHeader>
            <ScrollArea className="flex-1 mt-6">
              {FilterContent}
            </ScrollArea>
          </SheetContent>
        </Sheet>
      </>
    )
  }

  return null;
}
