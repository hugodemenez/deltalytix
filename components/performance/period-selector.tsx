'use client'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { resolveDateRange } from '@/lib/performance/date-utils'
import type { PeriodRange, PeriodType } from '@/lib/performance/types'

interface Props {
  value: PeriodRange
  onChange: (p: PeriodRange) => void
}

export function PeriodSelector({ value, onChange }: Props) {
  const { label } = resolveDateRange(value)

  const setType = (type: PeriodType) => onChange({ type, offset: 0 })
  const prev     = () => onChange({ ...value, offset: (value.offset ?? 0) - 1 })
  const next     = () => onChange({ ...value, offset: Math.min((value.offset ?? 0) + 1, 0) })
  const canNext  = (value.offset ?? 0) < 0

  return (
    <div className="flex items-center gap-2">
      <Select value={value.type} onValueChange={v => setType(v as PeriodType)}>
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="week">Week</SelectItem>
          <SelectItem value="month">Month</SelectItem>
          <SelectItem value="quarter">Quarter</SelectItem>
          <SelectItem value="year">Year</SelectItem>
        </SelectContent>
      </Select>

      <Button variant="outline" size="icon" onClick={prev}>
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <span className="text-sm font-medium min-w-32 text-center">{label}</span>

      <Button variant="outline" size="icon" onClick={next} disabled={!canNext}>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
