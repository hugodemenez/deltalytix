import { CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { useFormattedTrades } from "@/components/context/trades-data"
import { useState } from "react"
import { useMediaQuery } from "@/hooks/use-media-query"
import { cn } from "@/lib/utils"
import { DateRange, SelectRangeEventHandler } from "react-day-picker"
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths } from "date-fns"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

export default function DateCalendarFilter() {
  const { dateRange, setDateRange } = useFormattedTrades()
  const [calendarOpen, setCalendarOpen] = useState(false)
  const isMobile = useMediaQuery('(max-width: 768px)')

  const handleSelect: SelectRangeEventHandler = (range) => {
    setDateRange(range ? { from: range.from as Date, to: range.to as Date } : undefined);
    if (isMobile) {
      setCalendarOpen(false);
    }
  };

  const quickSelectors = [
    { label: "This Week", getRange: () => ({ from: startOfWeek(new Date()), to: endOfWeek(new Date()) }) },
    { label: "This Month", getRange: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
    { label: "Last 3 Months", getRange: () => ({ from: subMonths(new Date(), 3), to: new Date() }) },
    { label: "Last 6 Months", getRange: () => ({ from: subMonths(new Date(), 6), to: new Date() }) },
  ];

  const DateButton = (
    <Button
      id="date"
      variant={"outline"}
      className={cn(
        "w-full justify-start text-left font-normal",
        !dateRange && "text-muted-foreground"
      )}
      onClick={() => setCalendarOpen(true)}
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
  );

  const CalendarContent = (
    <div className="p-4">
      <div className="mb-4 space-y-2">
        {quickSelectors.map((selector, index) => (
          <Button
            key={index}
            variant="outline"
            className="w-full"
            onClick={() => {
              const range = selector.getRange();
              setDateRange(range);
              if (isMobile) setCalendarOpen(false);
            }}
          >
            {selector.label}
          </Button>
        ))}
      </div>
      <Calendar
        initialFocus
        mode="range"
        defaultMonth={dateRange?.from}
        selected={dateRange}
        onSelect={handleSelect}
        numberOfMonths={isMobile ? 1 : 2}
        className="rounded-md border"
      />
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={calendarOpen} onOpenChange={setCalendarOpen}>
        <SheetTrigger asChild>{DateButton}</SheetTrigger>
        <SheetContent side="bottom" className="h-[90vh] flex items-center justify-center">
          <div className="w-full max-w-sm mx-auto">
            {CalendarContent}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
      <PopoverTrigger asChild>{DateButton}</PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        {CalendarContent}
      </PopoverContent>
    </Popover>
  );
}