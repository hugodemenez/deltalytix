import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Filter, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RangeFilterProps {
  column: any
  title: string
  placeholder?: string
}

export function RangeFilter({ column, title, placeholder }: RangeFilterProps) {
  const [minValue, setMinValue] = useState('')
  const [maxValue, setMaxValue] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  const handleApplyFilter = () => {
    const min = minValue ? parseFloat(minValue) : undefined
    const max = maxValue ? parseFloat(maxValue) : undefined
    
    if (min !== undefined || max !== undefined) {
      column.setFilterValue({ min, max })
    } else {
      column.setFilterValue(undefined)
    }
    setIsOpen(false)
  }

  const handleClearFilter = () => {
    setMinValue('')
    setMaxValue('')
    column.setFilterValue(undefined)
    setIsOpen(false)
  }

  const isFiltered = column.getFilterValue() !== undefined

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 data-[state=open]:bg-accent",
            isFiltered && "bg-accent"
          )}
        >
          <Filter className="h-4 w-4" />
          {isFiltered && (
            <X className="ml-1 h-3 w-3" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">{title}</h4>
            <p className="text-sm text-muted-foreground">
              Filter by range
            </p>
          </div>
          <div className="grid gap-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="min-value">Min</Label>
                <Input
                  id="min-value"
                  type="number"
                  placeholder="Min"
                  value={minValue}
                  onChange={(e) => setMinValue(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="max-value">Max</Label>
                <Input
                  id="max-value"
                  type="number"
                  placeholder="Max"
                  value={maxValue}
                  onChange={(e) => setMaxValue(e.target.value)}
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearFilter}
              className="flex-1"
            >
              Clear
            </Button>
            <Button
              size="sm"
              onClick={handleApplyFilter}
              className="flex-1"
            >
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
} 