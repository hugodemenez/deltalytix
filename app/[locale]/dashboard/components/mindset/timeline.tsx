"use client"

import { cn } from "@/lib/utils"
import { useI18n } from "@/locales/client"
import { format, isToday, compareDesc } from "date-fns"
import { fr, enUS } from "date-fns/locale"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Trash2, Plus } from "lucide-react"
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
import { WidgetEmpty, widgetType } from "../widgets"

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

  /*
   * Emotional state is ordinary metadata, so it reads as a word rather than a
   * colored dot: one encoding per state, and that encoding is the label itself.
   */
  const getEmotionLabel = (value: number) => {
    if (value < 20) return t('mindset.emotion.verySad')
    if (value < 40) return t('mindset.emotion.sad')
    if (value < 60) return t('mindset.emotion.neutral')
    if (value < 80) return t('mindset.emotion.happy')
    return t('mindset.emotion.veryHappy')
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
        "flex h-full flex-col overflow-hidden border-r",
        "w-[180px] sm:w-[200px] md:w-[220px]",
        className
      )}>
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col gap-0.5 p-2">
            {/* Always show Today entry if no entry exists for today */}
            {!todayEntry && (
              <Button
                variant="ghost"
                className={cn(
                  "h-auto w-full justify-start p-2 text-left",
                  "motion-safe:transition-colors motion-safe:duration-150 motion-safe:ease-out",
                  isToday(selectedDate) && "bg-accent"
                )}
                aria-current={isToday(selectedDate) ? "date" : undefined}
                onClick={handleTodayClick}
              >
                <span className="truncate text-sm font-medium text-muted-foreground">
                  {t('mindset.today')}
                </span>
              </Button>
            )}

            {/* Show existing entries or empty state */}
            {!sortedMoodHistory?.length && todayEntry === undefined ? (
              <WidgetEmpty size="small" message={t('mindset.noEntries')} />
            ) : (
              sortedMoodHistory.map((mood) => {
                if (!mood?.day) return null
                const moodDate = mood.day instanceof Date ? mood.day : new Date(mood.day)
                const isSelected = moodDate.toDateString() === selectedDate.toDateString()
                const isCurrentDay = isToday(moodDate)
                const dateLabel = isCurrentDay
                  ? t('mindset.today')
                  : `${format(moodDate, 'EEE', { locale: dateLocale }).slice(0, 3)} ${format(moodDate, 'd', { locale: dateLocale })} ${format(moodDate, 'MMM', { locale: dateLocale }).slice(0, 3)}`

                return (
                  <div
                    key={moodDate.toISOString()}
                    className="group relative"
                  >
                    <Button
                      variant="ghost"
                      className={cn(
                        "h-auto w-full justify-start p-2 pr-8 text-left",
                        "motion-safe:transition-colors motion-safe:duration-150 motion-safe:ease-out",
                        isSelected && "bg-accent"
                      )}
                      aria-current={isSelected ? "date" : undefined}
                      onClick={() => onSelectDate(moodDate)}
                    >
                      <span className="flex min-w-0 flex-col items-start gap-0.5">
                        <span className="truncate text-sm font-medium">{dateLabel}</span>
                        <span className={cn(widgetType.caption, "truncate")}>
                          {getEmotionLabel(mood.emotionValue)}
                        </span>
                      </span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`${t('mindset.delete')}: ${dateLabel}`}
                      className={cn(
                        "absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2",
                        "opacity-0 focus-visible:opacity-100 group-hover:opacity-100",
                        "motion-safe:transition-opacity motion-safe:duration-150 motion-safe:ease-out",
                        "text-muted-foreground hover:text-destructive"
                      )}
                      onClick={(e) => handleDeleteClick(e, moodDate)}
                    >
                      <Trash2 className="h-3 w-3" aria-hidden />
                    </Button>
                  </div>
                )
              })
            )}
          </div>
        </div>

        <div className="border-t p-2">
          <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start gap-2 text-xs"
                size="sm"
              >
                <Plus className="h-4 w-4 shrink-0" aria-hidden />
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
