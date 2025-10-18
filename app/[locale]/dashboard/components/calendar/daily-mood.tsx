"use client"

import React from 'react'
import { Frown, Meh, Smile } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { CalendarEntry } from "@/app/[locale]/dashboard/types/calendar"
import { toast } from "sonner"
import { useI18n } from '@/locales/client'
import { saveMood, getMoodForDay } from '@/server/journal'
import { format } from 'date-fns'
import { useUserStore } from '../../../../../store/user-store'

interface DailyMoodProps {
  dayData: CalendarEntry | undefined;
  isWeekly?: boolean;
  selectedDate: Date;
}

const STORAGE_KEY = 'daily_mood'

export function DailyMood({ dayData, isWeekly = false, selectedDate }: DailyMoodProps) {
  const user = useUserStore(state => state.user)
  const t = useI18n()
  const [isLoading, setIsLoading] = React.useState<'bad' | 'okay' | 'great' | null>(null)
  const [selectedMood, setSelectedMood] = React.useState<'bad' | 'okay' | 'great' | null>(null)

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
          setSelectedMood(mood.mood as 'bad' | 'okay' | 'great')
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

  const handleMoodSelect = async (mood: 'bad' | 'okay' | 'great') => {
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

  if (!dayData?.trades?.length) {
    return (
      <div className="space-y-4">
        <Card className="flex flex-col">
          <CardHeader className="pb-1 flex-1">
            <CardTitle className="text-base md:text-lg">
              {isWeekly ? t('calendar.charts.weeklyMood') : t('calendar.charts.howWasYourDay')}
            </CardTitle>
          </CardHeader>
          {!isWeekly && (
            <CardContent className="pt-2 mt-auto">
              <div className="flex justify-around items-center">
                <Button
                  variant="ghost"
                  size="lg"
                  className={`flex flex-col items-center h-auto py-2 px-4 ${selectedMood === 'bad' ? 'text-red-500' : ''}`}
                  onClick={() => handleMoodSelect('bad')}
                  disabled={isLoading !== null}
                >
                  <Frown className={`h-6 w-6 ${isLoading === 'bad' ? 'animate-pulse' : ''}`} />
                </Button>
                
                <Button
                  variant="ghost"
                  size="lg"
                  className={`flex flex-col items-center h-auto py-2 px-4 ${selectedMood === 'okay' ? 'text-yellow-500' : ''}`}
                  onClick={() => handleMoodSelect('okay')}
                  disabled={isLoading !== null}
                >
                  <Meh className={`h-6 w-6 ${isLoading === 'okay' ? 'animate-pulse' : ''}`} />
                </Button>
                
                <Button
                  variant="ghost"
                  size="lg"
                  className={`flex flex-col items-center h-auto py-2 px-4 ${selectedMood === 'great' ? 'text-green-500' : ''}`}
                  onClick={() => handleMoodSelect('great')}
                  disabled={isLoading !== null}
                >
                  <Smile className={`h-6 w-6 ${isLoading === 'great' ? 'animate-pulse' : ''}`} />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-4 text-center">
                {t('calendar.modal.noTrades')}
              </p>
            </CardContent>
          )}
          {isWeekly && (
            <CardContent className="pt-2 mt-auto">
              <p className="text-sm text-muted-foreground">
                {t('calendar.charts.weeklyMoodNotAvailable')}
              </p>
            </CardContent>
          )}
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Card className="flex flex-col">
        <CardHeader className="pb-1 flex-1">
          <CardTitle className="text-base md:text-lg">
            {isWeekly ? t('calendar.charts.weeklyMood') : t('calendar.charts.howWasYourDay')}
          </CardTitle>
        </CardHeader>
        {!isWeekly && (
          <CardContent className="pt-2 mt-auto">
            <div className="flex justify-around items-center">
              <Button
                variant="ghost"
                size="lg"
                className={`flex flex-col items-center h-auto py-2 px-4 ${selectedMood === 'bad' ? 'text-red-500' : ''}`}
                onClick={() => handleMoodSelect('bad')}
                disabled={isLoading !== null}
              >
                <Frown className={`h-6 w-6 ${isLoading === 'bad' ? 'animate-pulse' : ''}`} />
              </Button>
              
              <Button
                variant="ghost"
                size="lg"
                className={`flex flex-col items-center h-auto py-2 px-4 ${selectedMood === 'okay' ? 'text-yellow-500' : ''}`}
                onClick={() => handleMoodSelect('okay')}
                disabled={isLoading !== null}
              >
                <Meh className={`h-6 w-6 ${isLoading === 'okay' ? 'animate-pulse' : ''}`} />
              </Button>
              
              <Button
                variant="ghost"
                size="lg"
                className={`flex flex-col items-center h-auto py-2 px-4 ${selectedMood === 'great' ? 'text-green-500' : ''}`}
                onClick={() => handleMoodSelect('great')}
                disabled={isLoading !== null}
              >
                <Smile className={`h-6 w-6 ${isLoading === 'great' ? 'animate-pulse' : ''}`} />
              </Button>
            </div>
          </CardContent>
        )}
        {isWeekly && (
          <CardContent className="pt-2 mt-auto">
            <p className="text-sm text-muted-foreground">
              {t('calendar.charts.weeklyMoodNotAvailable')}
            </p>
          </CardContent>
        )}
      </Card>
    </div>
  )
} 