"use client"

import React from 'react'
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Frown, Meh, Smile } from "lucide-react"
import { useI18n } from '@/locales/client'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { saveMood, getMoodForDay } from '@/server/journal'
import { toast } from "sonner"
import { format } from 'date-fns'
import { useUserStore } from '../../../../../store/user-store'

interface MoodSelectorProps {
  onMoodSelect?: (mood: 'bad' | 'okay' | 'great') => void;
}

const STORAGE_KEY = 'daily_mood'

type StoredMood = {
  mood: 'bad' | 'okay' | 'great';
  date: string;
}

export function MoodSelector({ onMoodSelect }: MoodSelectorProps) {
  const t = useI18n()
  const user = useUserStore(state => state.user)
  const [isLoading, setIsLoading] = React.useState<'bad' | 'okay' | 'great' | null>(null)
  const [selectedMood, setSelectedMood] = React.useState<'bad' | 'okay' | 'great' | null>(null)

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
          setSelectedMood(mood.mood as 'bad' | 'okay' | 'great')
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

  const handleMoodSelect = async (mood: 'bad' | 'okay' | 'great') => {
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

  const getMoodButtonStyle = (moodType: 'bad' | 'okay' | 'great') => {
    if (selectedMood === moodType) {
      switch (moodType) {
        case 'bad': return 'text-red-500'
        case 'okay': return 'text-yellow-500'
        case 'great': return 'text-green-500'
      }
    }
    return ''
  }

  return (
    <Card className="h-full">
      <div className="flex items-center justify-between h-full p-2">
        <span className="text-sm font-medium">{t('mood.question')}</span>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-6 w-6 p-0 hover:text-red-500 ${getMoodButtonStyle('bad')}`}
                  onClick={() => handleMoodSelect('bad')}
                  disabled={isLoading !== null}
                >
                  <Frown className={`h-3 w-3 ${isLoading === 'bad' ? 'animate-pulse' : ''}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {t('mood.bad')}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-6 w-6 p-0 hover:text-yellow-500 ${getMoodButtonStyle('okay')}`}
                  onClick={() => handleMoodSelect('okay')}
                  disabled={isLoading !== null}
                >
                  <Meh className={`h-3 w-3 ${isLoading === 'okay' ? 'animate-pulse' : ''}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {t('mood.okay')}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-6 w-6 p-0 hover:text-green-500 ${getMoodButtonStyle('great')}`}
                  onClick={() => handleMoodSelect('great')}
                  disabled={isLoading !== null}
                >
                  <Smile className={`h-3 w-3 ${isLoading === 'great' ? 'animate-pulse' : ''}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {t('mood.great')}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </Card>
  )
} 