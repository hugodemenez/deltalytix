"use client"

import React from 'react'
import { Button } from "@/components/ui/button"
import { Frown, Meh, Smile } from "lucide-react"
import { cn } from "@/lib/utils"
import { useI18n } from '@/locales/client'
import { saveMood, getMoodForDay } from '@/server/journal'
import { toast } from "sonner"
import { format } from 'date-fns'
import { useUserStore } from '../../../../../store/user-store'
import { WidgetBody, WidgetCard, WidgetHeader } from "../widgets"

interface MoodSelectorProps {
  onMoodSelect?: (mood: 'bad' | 'okay' | 'great') => void;
}

const STORAGE_KEY = 'daily_mood'

type MoodValue = 'bad' | 'okay' | 'great'

type StoredMood = {
  mood: MoodValue;
  date: string;
}

const MOOD_ICONS = {
  bad: Frown,
  okay: Meh,
  great: Smile,
} as const

export function MoodSelector({ onMoodSelect }: MoodSelectorProps) {
  const t = useI18n()
  const user = useUserStore(state => state.user)
  const [isLoading, setIsLoading] = React.useState<MoodValue | null>(null)
  const [selectedMood, setSelectedMood] = React.useState<MoodValue | null>(null)

  // Load mood from localStorage or fetch from server on mount
  React.useEffect(() => {
    const loadMood = async () => {
      if (!user?.id) return

      // Check localStorage first
      const today = new Date().toISOString().split('T')[0]
      const storedMoodData = localStorage.getItem(STORAGE_KEY)

      if (storedMoodData) {
        const storedMood: StoredMood = JSON.parse(storedMoodData)
        if (storedMood.date === today) {
          setSelectedMood(storedMood.mood)
          return
        }
      }

      // If no valid localStorage data, fetch from server
      try {
        const dateKey = format(new Date(), 'yyyy-MM-dd')
        const mood = await getMoodForDay(dateKey)
        if (mood) {
          setSelectedMood(mood.mood as MoodValue)
          // Update localStorage
          localStorage.setItem(STORAGE_KEY, JSON.stringify({
            mood: mood.mood,
            date: today
          }))
        }
      } catch (error) {
        console.error('Error loading mood:', error)
      }
    }

    loadMood()
  }, [user?.id])

  const handleMoodSelect = async (mood: MoodValue) => {
    if (!user?.id) {
      toast.error(t('auth.required'))
      return
    }

    setIsLoading(mood)
    try {
      await saveMood(mood)
      setSelectedMood(mood)
      onMoodSelect?.(mood)

      // Save to localStorage
      const today = new Date().toISOString().split('T')[0]
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        mood,
        date: today
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

  /*
   * Mood is ordinary metadata, so it stays monochrome: selection is carried by
   * one encoding (the pressed button) plus the visible label, never by a
   * colored pill or an emoji standing in for the word.
   */
  return (
    <WidgetCard>
      <WidgetHeader size="small" title={t('mood.question')} />
      <WidgetBody size="small" className="flex items-center">
        <div className="flex w-full flex-wrap items-center gap-1">
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
                className="h-7 gap-1.5 px-2"
                onClick={() => handleMoodSelect(value)}
                disabled={isLoading !== null}
              >
                <Icon
                  aria-hidden
                  className={cn(
                    "h-3.5 w-3.5",
                    isLoading === value && "motion-safe:animate-pulse",
                  )}
                />
                <span className="text-xs">{label}</span>
              </Button>
            )
          })}
        </div>
      </WidgetBody>
    </WidgetCard>
  )
}
