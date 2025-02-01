import { CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { useUserData } from "@/components/context/user-data"
import { useState } from "react"
import { useMediaQuery } from "@/hooks/use-media-query"
import { cn } from "@/lib/utils"
import { DateRange, SelectRangeEventHandler } from "react-day-picker"
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths } from "date-fns"
import { fr } from 'date-fns/locale'
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useI18n } from "@/locales/client"
import { useParams } from "next/navigation"

export default function DateCalendarFilter() {
  const { dateRange, setDateRange } = useUserData()
  const [calendarOpen, setCalendarOpen] = useState(false)
  const isMobile = useMediaQuery('(max-width: 768px)')
  const t = useI18n()
  const params = useParams()
  const locale = params.locale as string
  
  const dateLocale = locale === 'fr' ? fr : undefined

  const handleSelect: SelectRangeEventHandler = (range) => {
    setDateRange(range ? { from: range.from as Date, to: range.to as Date } : undefined);
    if (isMobile) {
      setCalendarOpen(false);
    }
  };

  const formatDate = (date: Date) => {
    return format(date, "LLL dd, y", { locale: dateLocale })
  }

  const quickSelectors = [
    { label: t('filters.thisWeek'), getRange: () => ({ from: startOfWeek(new Date()), to: endOfWeek(new Date()) }) },
    { label: t('filters.thisMonth'), getRange: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
    { label: t('filters.lastThreeMonths'), getRange: () => ({ from: subMonths(new Date(), 3), to: new Date() }) },
    { label: t('filters.lastSixMonths'), getRange: () => ({ from: subMonths(new Date(), 6), to: new Date() }) },
  ];

  const DateButton = (
    <Button
      id="date"
      variant={"outline"}
      className={cn(
        "justify-start text-left font-normal",
        !dateRange && "text-muted-foreground"
      )}
      onClick={() => setCalendarOpen(true)}
    >
      <CalendarIcon className="mr-2 h-4 w-4" />
      {dateRange?.from ? (
        dateRange.to ? (
          <>
            {formatDate(dateRange.from)} -{" "}
            {formatDate(dateRange.to)}
          </>
        ) : (
          formatDate(dateRange.from)
        )
      ) : (
        <span>{t('filters.pickDate')}</span>
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
        locale={dateLocale}
      />
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={calendarOpen} onOpenChange={setCalendarOpen}>
        <SheetTrigger asChild>
          {DateButton}
        </SheetTrigger>
        <SheetContent>
          {CalendarContent}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
      <PopoverTrigger asChild>
        {DateButton}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        {CalendarContent}
      </PopoverContent>
    </Popover>
  );
}