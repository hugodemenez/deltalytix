"use client"

import { useState } from "react"
import { CommandItem } from "@/components/ui/command"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useData } from "@/context/data-provider"
import { useI18n } from "@/locales/client"
import { cn } from "@/lib/utils"

interface PnlSectionProps {
  searchValue: string
}

export function PnlSection({ searchValue }: PnlSectionProps) {
  const t = useI18n()
  const { pnlRange, setPnlRange } = useData()
  const [customMin, setCustomMin] = useState<string>("")
  const [customMax, setCustomMax] = useState<string>("")
  const [showCustomInputs, setShowCustomInputs] = useState(false)

  const handlePresetSelect = (min: number | undefined, max: number | undefined) => {
    setPnlRange({ min, max })
    setShowCustomInputs(false)
    setCustomMin("")
    setCustomMax("")
  }

  const handleCustomRangeApply = () => {
    setPnlRange({
      min: customMin === "" ? undefined : Number(customMin),
      max: customMax === "" ? undefined : Number(customMax)
    })
    setShowCustomInputs(false)
  }

  const isPresetActive = (min: number | undefined, max: number | undefined) => {
    return pnlRange.min === min && pnlRange.max === max
  }

  const presets = [
    { label: t('filters.allTrades'), min: undefined, max: undefined },
    { label: t('filters.profitableTrades'), min: 0, max: undefined },
    { label: t('filters.losingTrades'), min: undefined, max: 0 },
  ]

  // Filter presets based on search
  const filteredPresets = searchValue
    ? presets.filter(preset => 
        preset.label.toLowerCase().includes(searchValue.toLowerCase())
      )
    : presets

  return (
    <>
      {/* Preset buttons */}
      {filteredPresets.map((preset, index) => (
        <CommandItem
          key={index}
          onSelect={() => handlePresetSelect(preset.min, preset.max)}
          className={cn(
            "px-2",
            isPresetActive(preset.min, preset.max) && "bg-accent"
          )}
        >
          <span className="text-sm">{preset.label}</span>
        </CommandItem>
      ))}

      {/* Custom range toggle */}
      <CommandItem
        onSelect={() => setShowCustomInputs(!showCustomInputs)}
        className="px-2"
      >
        <span className="text-sm">{t('filters.customRange')}</span>
      </CommandItem>

      {/* Custom range inputs */}
      {showCustomInputs && (
        <div className="px-2 py-2 space-y-2 border-t">
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder={t('filters.min')}
              value={customMin}
              onChange={(e) => setCustomMin(e.target.value)}
              className="h-8 text-sm"
            />
            <Input
              type="number"
              placeholder={t('filters.max')}
              value={customMax}
              onChange={(e) => setCustomMax(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <Button
            onClick={handleCustomRangeApply}
            size="sm"
            className="w-full h-8"
            variant="secondary"
          >
            {t('filters.apply')}
          </Button>
        </div>
      )}

      {/* Current PnL Range Display */}
      {pnlRange && (pnlRange.min !== undefined || pnlRange.max !== undefined) && (
        <div className="px-2 py-1 text-xs text-muted-foreground">
          {pnlRange.min !== undefined && pnlRange.max !== undefined
            ? `${pnlRange.min} ≤ PnL ≤ ${pnlRange.max}`
            : pnlRange.min !== undefined
            ? `PnL ≥ ${pnlRange.min}`
            : `PnL ≤ ${pnlRange.max}`
          }
        </div>
      )}
    </>
  )
}
