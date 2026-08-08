"use client"

import React from 'react'
import { Frown, Meh, Smile } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { CalendarEntry } from "@/app/[locale]/dashboard/types/calendar"
import { toast } from "sonner"
import { useI18n } from '@/locales/client'
import { saveMood, getMoodForDay } from '@/server/journal'
import { format } from 'date-fns'
import { useUserStore } from '../../../../../store/user-store'
import { widgetType } from "../widgets"

interface DailyMoodProps {
  dayData: CalendarEntry | undefined;
  isWeekly?: boolean;
  selectedDate: Date;
}

const STORAGE_KEY = 'daily_mood'

type MoodValue = 'bad' | 'okay' | 'great'

const MOOD_ICONS = {
  bad: Frown,
  okay: Meh,
  great: Smile,
} as const

export function DailyMood({ dayData, isWeekly = false, selectedDate }: DailyMoodProps) {
  const user = useUserStore(state => state.user)
  const t = useI18n()
  const [isLoading, setIsLoading] = React.useState<MoodValue | null>(null)
  const [selectedMood, setSelectedMood] = React.useState<MoodValue | null>(null)

  // Load mood from localStorage or fetch from server on mount
  React.useEffect(() => {
    const loadMood = async () => {
      if (!user?.id) return

      // Check localStorage first
      const focusedDay = selectedDate.toISOString().split('T')[0]
      const storedMoodData = localStorage.getItem(STORAGE_KEY)

      if (storedMoodData) {
        const storedMood = JSON.parse(storedMoodData)
        if (storedMood.date === focusedDay) {
          setSelectedMood(storedMood.mood)
          return
        }
      }

      // If no valid localStorage data, fetch from server
      try {
        const dateKey = format(selectedDate, 'yyyy-MM-dd')
        const mood = await getMoodForDay(dateKey)
        if (mood) {
          setSelectedMood(mood.mood as MoodValue)
          // Update localStorage
          localStorage.setItem(STORAGE_KEY, JSON.stringify({
            mood: mood.mood,
            date: focusedDay
          }))
        }
      } catch (error) {
        console.error('Error loading mood:', error)
      }
    }

    loadMood()
  }, [user?.id, selectedDate])

  const handleMoodSelect = async (mood: MoodValue) => {
    if (!user?.id) {
      toast.error(t('auth.required'))
      return
    }

    setIsLoading(mood)
    try {
      const date = new Date(selectedDate)
      // Set the time to noon to avoid timezone issues
      date.setHours(12, 0, 0, 0)
      const dateKey = format(selectedDate, 'yyyy-MM-dd')
      await saveMood(mood, [], dateKey)
      setSelectedMood(mood)

      // Save to localStorage
      const focusedDay = date.toISOString().split('T')[0]
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        mood,
        date: focusedDay
      }))

      toast.success(t('mood.saved'))
    } catch (error) {
      console.error('Error saving mood:', error)
      toast.error(t('mood.error'))
    } finally {
      setIsLoading(null)
    }
  }

  const moods: { value: MoodValue; label: string }[] = [
    { value: 'bad', label: t('mood.bad') },
    { value: 'okay', label: t('mood.okay') },
    { value: 'great', label: t('mood.great') },
  ]

  const hasTrades = Boolean(dayData?.trades?.length)

  /*
   * This sits inside a modal, which is already a surface: a titled group with
   * spacing, not a card. Mood is ordinary metadata, so it stays monochrome and
   * every state carries its own text label.
   */
  return (
    <section className="flex flex-col gap-2">
      <h4 className={widgetType.section}>
        {isWeekly ? t('calendar.charts.weeklyMood') : t('calendar.charts.howWasYourDay')}
      </h4>
      {isWeekly ? (
        <p className={widgetType.label}>
          {t('calendar.charts.weeklyMoodNotAvailable')}
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-1">
            {moods.map(({ value, label }) => {
              const Icon = MOOD_ICONS[value]
              const isSelected = selectedMood === value
              return (
                <Button
                  key={value}
                  type="button"
                  variant={isSelected ? 'secondary' : 'ghost'}
                  size="sm"
                  aria-pressed={isSelected}
                  className="h-8 gap-1.5 px-2"
                  onClick={() => handleMoodSelect(value)}
                  disabled={isLoading !== null}
                >
                  <Icon
                    aria-hidden
                    className={cn(
                      "h-4 w-4",
                      isLoading === value && "motion-safe:animate-pulse",
                    )}
                  />
                  <span className="text-xs">{label}</span>
                </Button>
              )
            })}
          </div>
          {!hasTrades && (
            <p className={widgetType.label}>{t('calendar.modal.noTrades')}</p>
          )}
        </>
      )}
    </section>
  )
}
