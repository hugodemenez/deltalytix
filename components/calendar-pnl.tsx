import React, { useMemo, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { eachDayOfInterval, format, getDay, isToday } from "date-fns"
import { Badge } from "./ui/badge"
import { cn } from "@/lib/utils"
import { Textarea } from "./ui/textarea"
import { Button } from "./ui/button"

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function CalendarPnl({dateRange, calendarData}:{dateRange: {from: Date, to: Date}, calendarData: any}) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [comment, setComment] = useState<string>("")


  const calendarDays = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return []
    return eachDayOfInterval({ start: dateRange.from, end: dateRange.to })
  }, [dateRange])

  const handleSaveComment = () => {
    // Here you would typically save the comment to your backend
    console.log(`Saving comment for ${selectedDate}: ${comment}`)
    setComment("")
    setSelectedDate(null)
  }
  const [isOpen, setIsOpen] = useState(false);
return(
      <div className="grid grid-cols-1 sm:grid-cols-7 gap-4">
        {WEEKDAYS.map((day) => (
          <div key={day} className="hidden sm:block text-center font-semibold">{day}</div>
        ))}
        {calendarDays.map((date, index) => {
          const dateString = format(date, 'yyyy-MM-dd')
          const dayData = calendarData[dateString]
          const dayOfWeek = getDay(date)
          const isFirstDay = index === 0

          return (
            <React.Fragment key={dateString}>
              {isFirstDay && dayOfWeek !== 0 && (
                <div className="col-span-7" style={{ gridColumnStart: 1, gridColumnEnd: dayOfWeek + 1 }}></div>
              )}
              <Dialog>
                <DialogTrigger asChild>
                  <Card className={cn(
                    "block h-24 cursor-pointer hover:border-primary transition-colors",
                    dayData ? (dayData.pnl >= 0 ? "bg-green-50" : "bg-red-50") : "",
                    // !isSameMonth(date, dateRange?.from || new Date()) && "opacity-50"
                  )}>
                    <CardHeader className="p-2">
                      <CardTitle className="text-xs font-medium flex justify-between">
                        <span>{format(date, 'dd/MM/yyyy')}</span>
                        {isToday(date) && <Badge variant="outline">Today</Badge>}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-2">
                      {dayData ? (
                        <>
                          <div className={cn(
                            "text-sm font-bold",
                            dayData.pnl >= 0 ? "text-green-600" : "text-red-600"
                          )}>
                            ${parseFloat(dayData.pnl.toFixed(2))}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {dayData.tradeNumber} trade{dayData.formattedTrades > 1 ? 's' : ''}
                          </div>
                        </>
                      ) : (
                        <div className="text-xs text-muted-foreground">No formattedTrades</div>
                      )}
                    </CardContent>
                  </Card>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{format(date, 'MMMM d, yyyy')}</DialogTitle>
                    <DialogDescription>
                      Add a comment for this day or view trade details.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Textarea
                        id="comment"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        className="col-span-4"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" onClick={handleSaveComment}>Save comment</Button>
                    <Button variant="outline" onClick={() => window.open(`/formattedTrades/${dateString}`, '_blank')}>
                      View Details
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </React.Fragment>
          )
        })}
      </div>
)
}