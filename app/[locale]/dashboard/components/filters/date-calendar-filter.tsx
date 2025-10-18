import { CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { useData } from "@/context/data-provider"
import { useState, useRef } from "react"
import { useMediaQuery } from "@/hooks/use-media-query"
import { cn } from "@/lib/utils"
import { DateRange, SelectRangeEventHandler, SelectSingleEventHandler } from "react-day-picker"
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths } from "date-fns"
import { fr } from 'date-fns/locale'
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useI18n } from "@/locales/client"
import { useParams } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CalendarDaysIcon, type CalendarDaysIconHandle } from "@/components/animated-icons/calendar-days"
import { X } from "lucide-react"

export default function DateCalendarFilter() {
  const { dateRange, setDateRange } = useData()
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [mode, setMode] = useState<'single' | 'range'>('range')
  const isMobile = useMediaQuery('(max-width: 768px)')
  const t = useI18n()
  const params = useParams()
  const locale = params.locale as string
  const calendarIconRef = useRef<CalendarDaysIconHandle>(null)
  
  const dateLocale = locale === 'fr' ? fr : undefined

  const handleRangeSelect: SelectRangeEventHandler = (range) => {
    setDateRange(range ? { from: range.from as Date, to: range.to as Date } : undefined);
    if (isMobile) {
      setCalendarOpen(false);
    }
  };

  const handleSingleSelect: SelectSingleEventHandler = (date) => {
    setDateRange(date ? { from: date, to: date } : undefined);
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
      onMouseEnter={() => calendarIconRef.current?.startAnimation()}
      onMouseLeave={() => calendarIconRef.current?.stopAnimation()}
    >
      <CalendarDaysIcon ref={calendarIconRef} className="h-4 w-4 mr-2" />
      {dateRange?.from ? (
        dateRange.to && dateRange.from.getTime() !== dateRange.to.getTime() ? (
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
      <Tabs defaultValue="range" className="w-full" onValueChange={(value) => setMode(value as 'single' | 'range')}>
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="single">{t('filters.singleDay')}</TabsTrigger>
          <TabsTrigger value="range">{t('filters.dateRange')}</TabsTrigger>
        </TabsList>
        {dateRange && (
          <Button
            variant="destructive"
            className="w-full mb-4"
            onClick={() => {
              setDateRange(undefined)
              if (isMobile) setCalendarOpen(false)
            }}
          >
            <X className="h-4 w-4 mr-2" />
            {t('filters.clearDate')}
          </Button>
        )}
        <TabsContent value="single">
          <div className="mb-4 space-y-2">
            {quickSelectors.map((selector, index) => (
              <Button
                key={index}
                variant="outline"
                className="w-full"
                onClick={() => {
                  const range = selector.getRange();
                  setDateRange({ from: range.from, to: range.from });
                  if (isMobile) setCalendarOpen(false);
                }}
              >
                {selector.label}
              </Button>
            ))}
          </div>
          <Calendar
            initialFocus
            mode="single"
            defaultMonth={dateRange?.from}
            selected={dateRange?.from}
            onSelect={handleSingleSelect}
            numberOfMonths={isMobile ? 1 : 2}
            className="rounded-md border"
            locale={dateLocale}
          />
        </TabsContent>
        <TabsContent value="range">
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
            onSelect={handleRangeSelect}
            numberOfMonths={isMobile ? 1 : 2}
            className="rounded-md border"
            locale={dateLocale}
          />
        </TabsContent>
      </Tabs>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={calendarOpen} onOpenChange={setCalendarOpen}>
        <SheetTrigger asChild>
          {DateButton}
        </SheetTrigger>
        <SheetContent side="right" className="w-[90vw] sm:max-w-[640px] flex flex-col h-dvh overflow-hidden">
          <SheetHeader>
            <SheetTitle>{t('filters.pickDate')}</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-auto">
            {CalendarContent}
          </div>
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