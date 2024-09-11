import { CalendarIcon } from "lucide-react"
import { Button } from "../ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover"
import { Calendar } from "../ui/calendar"
import { useFormattedTrades, useTrades } from "../context/trades-data"
import { useRef, useState } from "react"
import { useMediaQuery } from "@/hooks/use-media-query"
import { cn } from "@/lib/utils"
import { DateRange, SelectRangeEventHandler } from "react-day-picker"
import { addDays, format } from "date-fns"

export default function DateCalendarFilter( ) {
  const { dateRange, setDateRange } = useFormattedTrades()
  const [calendarOpen, setCalendarOpen] = useState(false)
  const isMobile = useMediaQuery('(max-width: 768px)')
  const handleSelect: SelectRangeEventHandler = (range) => {
    setDateRange(range ? { from: range.from as Date, to: range.to as Date } : undefined);
  };

  return (
    <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal",
              !dateRange && "text-muted-foreground"
            )}
          >
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
              <span>Pick a date</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={dateRange?.from}
            selected={dateRange}
            onSelect={handleSelect}
            numberOfMonths={isMobile ? 1 : 2}
          />
        </PopoverContent>
      </Popover>
  )
}