import React from 'react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, ChevronDown } from 'lucide-react'
import { DateRange } from 'react-day-picker'
import { format, subDays, startOfYear, endOfYear } from 'date-fns'
import { cn } from '@/lib/utils'

interface DateRangeSelectorProps {
  dateRange: DateRange | undefined
  setDateRange: React.Dispatch<React.SetStateAction<DateRange | undefined>>
}

export default function DateRangeSelector({ dateRange, setDateRange }: DateRangeSelectorProps) {
  const quickSelectOptions = [
    { label: 'Last 24 hours', value: 'last24Hours' },
    { label: 'Last 7 days', value: 'last7Days' },
    { label: 'Last 30 days', value: 'last30Days' },
    { label: 'Last 3 months', value: 'last3Months' },
    { label: 'Year to Date', value: 'yearToDate' },
    { label: 'Last 12 months', value: 'last12Months' },
    { label: 'All Time', value: 'allTime' },
  ]

  const handleQuickSelect = (value: string) => {
    const today = new Date()
    let from: Date
    let to: Date = today

    switch (value) {
      case 'last24Hours':
        from = subDays(today, 1)
        break
      case 'last7Days':
        from = subDays(today, 7)
        break
      case 'last30Days':
        from = subDays(today, 30)
        break
      case 'last3Months':
        from = subDays(today, 90)
        break
      case 'yearToDate':
        from = startOfYear(today)
        break
      case 'last12Months':
        from = subDays(today, 365)
        break
      case 'allTime':
        from = new Date(0) // Earliest possible date
        break
      default:
        return
    }

    setDateRange({ from, to })
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full sm:w-[300px] justify-between text-left font-normal ",
            !dateRange && "text-muted-foreground"
          )}
        >
          <div className="flex items-center">
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateRange?.from ? (
              dateRange.to ? (
                <>
                  {format(dateRange.from, "LLL dd, y")} -{" "}
                  {format(dateRange.to, "LLL dd, y")}
                </>
              ) : (
                format(dateRange.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="sm:w-[800px] p-0" align="start">
        <div className="flex flex-col sm:flex-row gap-2 p-2">
          <div className="space-y-2 flex-1">
            {quickSelectOptions.map((option) => (
              <Button
                key={option.value}
                variant="outline"
                className="w-full justify-start text-left font-normal"
                onClick={() => handleQuickSelect(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={dateRange?.from}
            selected={dateRange}
            onSelect={setDateRange}
            numberOfMonths={2}
            className="col-span-3"
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}