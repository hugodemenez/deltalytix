"use client"

import { cn } from "@/lib/utils"
import { useI18n } from "@/locales/client"
import { format, isToday, compareDesc } from "date-fns"
import { fr, enUS } from "date-fns/locale"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Calendar, Trash2, Plus } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { useState } from "react"
import { toast } from "sonner"

interface TimelineProps {
  onSelectDate: (date: Date) => void
  selectedDate: Date
  moodHistory: Array<{ day: Date; emotionValue: number }>
  className?: string
  onDeleteEntry?: (date: Date) => Promise<void>
}

export function Timeline({ onSelectDate, selectedDate, moodHistory, className, onDeleteEntry }: TimelineProps) {
  const t = useI18n()
  const { locale } = useParams()
  const dateLocale = locale === 'fr' ? fr : enUS
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [entryToDelete, setEntryToDelete] = useState<Date | null>(null)
  const [datePickerOpen, setDatePickerOpen] = useState(false)

  const getEmotionColor = (value: number) => {
    if (value < 20) return 'bg-red-500'
    if (value < 40) return 'bg-orange-500'
    if (value < 60) return 'bg-yellow-500'
    if (value < 80) return 'bg-green-500'
    return 'bg-emerald-500'
  }

  const handleDeleteClick = (e: React.MouseEvent, date: Date) => {
    e.stopPropagation()
    setEntryToDelete(date)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!entryToDelete || !onDeleteEntry) return

    try {
      await onDeleteEntry(entryToDelete)
      toast.success(t('mindset.deleteSuccess'), {
        description: t('mindset.deleteSuccessDescription'),
      })
    } catch (error) {
      toast.error(t('mindset.deleteError'), {
        description: t('mindset.deleteErrorDescription'),
      })
    } finally {
      setDeleteDialogOpen(false)
      setEntryToDelete(null)
    }
  }

  // Sort mood history by date in descending order
  const sortedMoodHistory = [...(moodHistory || [])].sort((a, b) => {
    if (!a?.day || !b?.day) return 0
    const dateA = a.day instanceof Date ? a.day : new Date(a.day)
    const dateB = b.day instanceof Date ? b.day : new Date(b.day)
    return compareDesc(dateA, dateB)
  })

  // Check if there's an entry for today
  const todayEntry = sortedMoodHistory.find(mood => {
    if (!mood?.day) return false
    const moodDate = mood.day instanceof Date ? mood.day : new Date(mood.day)
    return isToday(moodDate)
  })

  const handleTodayClick = () => {
    onSelectDate(new Date())
  }

  return (
    <>
      <div className={cn(
        "h-full border-r overflow-hidden flex flex-col",
        "w-[180px] sm:w-[200px] md:w-[220px]",
        className
      )}>
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-1 p-2">
            {/* Always show Today entry if no entry exists for today */}
            {!todayEntry && (
              <div className="group relative">
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-2 h-auto p-2",
                    "hover:bg-accent/50 transition-colors border-l-2 border-dashed border-muted-foreground/30",
                    isToday(selectedDate) && "bg-accent"
                  )}
                  onClick={handleTodayClick}
                >
                  <div className="flex flex-col items-center justify-center gap-1 min-w-10">
                    <div className="w-2 h-2 rounded-full bg-muted-foreground/50" />
                  </div>
                  <div className="flex-1 text-left min-w-0 flex items-center">
                    <p className="text-sm font-medium text-muted-foreground">
                      {t('mindset.today')}
                    </p>
                  </div>
                </Button>
              </div>
            )}

            {/* Show existing entries or empty state */}
            {!sortedMoodHistory?.length && todayEntry === undefined ? (
              <div className="flex flex-col items-center justify-center p-4 text-center">
                <Calendar className="h-6 w-6 text-muted-foreground mb-2" />
                <p className="text-xs text-muted-foreground">
                  {t('mindset.noEntries')}
                </p>
              </div>
            ) : (
              sortedMoodHistory.map((mood) => {
                if (!mood?.day) return null
                const moodDate = mood.day instanceof Date ? mood.day : new Date(mood.day)
                const isSelected = moodDate.toDateString() === selectedDate.toDateString()
                const isCurrentDay = isToday(moodDate)
                
                return (
                  <div
                    key={moodDate.toISOString()}
                    className="group relative"
                  >
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start gap-2 h-auto p-2",
                        "hover:bg-accent/50 transition-colors",
                        isSelected && "bg-accent",
                        isCurrentDay && "border-l-2 border-primary"
                      )}
                      onClick={() => onSelectDate(moodDate)}
                    >
                      <div className="flex flex-col items-center justify-center gap-1 min-w-10">
                        <div className={cn(
                          "w-2 h-2 rounded-full transition-colors",
                          getEmotionColor(mood.emotionValue)
                        )} />
                      </div>
                      <div className="flex-1 text-left min-w-0 flex items-center">
                        <p className="text-sm font-medium truncate">
                          {isCurrentDay ? t('mindset.today') : `${format(moodDate, 'EEE', { locale: dateLocale }).slice(0, 3)} ${format(moodDate, 'd', { locale: dateLocale })} ${format(moodDate, 'MMM', { locale: dateLocale }).slice(0, 3)}`}
                        </p>
                      </div>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6",
                        "opacity-0 group-hover:opacity-100 transition-opacity",
                        "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      )}
                      onClick={(e) => handleDeleteClick(e, moodDate)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )
              })
            )}
          </div>
        </div>
        
        <div className="p-2 border-t">
          <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start gap-2 text-xs"
                size="sm"
              >
                <Plus className="h-4 w-4 shrink-0" />
                {t('mindset.addEntry')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  if (date) {
                    onSelectDate(date)
                    setDatePickerOpen(false)
                  }
                }}
                locale={dateLocale}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('mindset.deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('mindset.deleteConfirmDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('mindset.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('mindset.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
} 