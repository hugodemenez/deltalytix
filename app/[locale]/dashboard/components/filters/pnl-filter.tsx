"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useData } from "@/context/data-provider"
import { useI18n } from "@/locales/client"
import { useState } from "react"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"

export function PnlFilter() {
  const t = useI18n()
  const { pnlRange, setPnlRange } = useData()
  const [customMin, setCustomMin] = useState<string>("")
  const [customMax, setCustomMax] = useState<string>("")

  const handlePresetSelect = (min: number | undefined, max: number | undefined) => {
    setPnlRange({ min, max })
  }

  const handleCustomRangeApply = () => {
    setPnlRange({
      min: customMin === "" ? undefined : Number(customMin),
      max: customMax === "" ? undefined : Number(customMax)
    })
  }

  return (
    <div className="p-2 space-y-2">
      <DropdownMenuItem onClick={() => handlePresetSelect(undefined, undefined)}>
        {t('filters.allTrades')}
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => handlePresetSelect(0, undefined)}>
        {t('filters.profitableTrades')}
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => handlePresetSelect(undefined, 0)}>
        {t('filters.losingTrades')}
      </DropdownMenuItem>
      <div className="space-y-2 pt-2">
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder={t('filters.min')}
            value={customMin}
            onChange={(e) => setCustomMin(e.target.value)}
            className="w-full"
          />
          <Input
            type="number"
            placeholder={t('filters.max')}
            value={customMax}
            onChange={(e) => setCustomMax(e.target.value)}
            className="w-full"
          />
        </div>
        <Button 
          onClick={handleCustomRangeApply}
          className="w-full"
          variant="secondary"
        >
          {t('filters.apply')}
        </Button>
      </div>
    </div>
  )
} 