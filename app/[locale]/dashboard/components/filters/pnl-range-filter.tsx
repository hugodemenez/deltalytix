import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { useData } from "@/context/data-provider"
import { useI18n } from "@/locales/client"
import { useState } from "react"
import { ChevronDown } from "lucide-react"

export function PnlRangeFilter() {
  const t = useI18n()
  const { pnlRange, setPnlRange } = useData()
  const [customMin, setCustomMin] = useState<string>("")
  const [customMax, setCustomMax] = useState<string>("")
  const [open, setOpen] = useState(false)

  const handlePresetSelect = (min: number | undefined, max: number | undefined) => {
    setPnlRange({ min, max })
    setOpen(false)
  }

  const handleCustomRangeApply = () => {
    setPnlRange({
      min: customMin === "" ? undefined : Number(customMin),
      max: customMax === "" ? undefined : Number(customMax)
    })
    setOpen(false)
  }

  const getButtonLabel = () => {
    if (pnlRange.min === undefined && pnlRange.max === undefined) {
      return t('filters.pnl')
    }
    if (pnlRange.min !== undefined && pnlRange.max === undefined) {
      return `PnL ≥ ${pnlRange.min}`
    }
    if (pnlRange.min === undefined && pnlRange.max !== undefined) {
      return `PnL ≤ ${pnlRange.max}`
    }
    return `${pnlRange.min} ≤ PnL ≤ ${pnlRange.max}`
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex gap-2">
          {getButtonLabel()}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="start">
        <DropdownMenuItem onClick={() => handlePresetSelect(undefined, undefined)}>
          {t('filters.allTrades')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handlePresetSelect(0, undefined)}>
          {t('filters.profitableTrades')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handlePresetSelect(undefined, 0)}>
          {t('filters.losingTrades')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <div className="p-2">
          <div className="space-y-2">
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
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 