'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useI18n } from "@/locales/client"
import { useUserData } from "@/components/context/user-data"
import { useToast } from "@/hooks/use-toast"
import { CalendarEntry } from "@/types/calendar"
import { saveMood, getMoodForDay } from '@/server/mood'

const STORAGE_KEY = 'daily_mood'

interface DailyCommentProps {
  dayData: CalendarEntry | undefined
  selectedMood: 'bad' | 'okay' | 'great' | null
}

export function DailyComment({ dayData, selectedMood }: DailyCommentProps) {
  const t = useI18n()
  const { user } = useUserData()
  const { toast } = useToast()
  const [comment, setComment] = React.useState<string>("")
  const [isSavingComment, setIsSavingComment] = React.useState(false)
  const [saveError, setSaveError] = React.useState<string | null>(null)

  // Load comment from localStorage or server on mount
  React.useEffect(() => {
    const loadComment = async () => {
      if (!user?.id || !dayData?.trades?.[0]?.entryDate) return

      const focusedDay = new Date(dayData.trades[0].entryDate).toISOString().split('T')[0]
      const storedMoodData = localStorage.getItem(STORAGE_KEY)
      
      if (storedMoodData) {
        const storedMood = JSON.parse(storedMoodData)
        if (storedMood.date === focusedDay) {
          setComment(storedMood.comment || '')
          return
        }
      }

      try {
        const mood = await getMoodForDay(new Date(dayData.trades[0].entryDate))
        if (mood) {
          const comment = mood.conversation ? 
            (mood.conversation as Array<{ role: string; content: string }>).find(msg => msg.role === 'user')?.content || '' 
            : ''
          setComment(comment)
        }
      } catch (error) {
        console.error('Error loading comment:', error)
      }
    }

    loadComment()
  }, [user?.id, dayData?.trades])

  const handleSaveComment = async () => {
    if (!user?.id || !dayData?.trades?.[0]?.entryDate || !selectedMood) {
      toast({
        title: t('error'),
        description: t('auth.required'),
        variant: "destructive",
      })
      return
    }

    setIsSavingComment(true)
    setSaveError(null)
    
    try {
      const date = new Date(dayData.trades[0].entryDate)
      date.setHours(12, 0, 0, 0)
      await saveMood(selectedMood, [{ role: 'user', content: comment }], date)
      
      // Update localStorage
      const focusedDay = date.toISOString().split('T')[0]
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        mood: selectedMood,
        comment,
        date: focusedDay
      }))

      toast({
        title: t('success'),
        description: t('calendar.charts.commentSaved'),
      })
    } catch (error) {
      console.error('Error saving comment:', error)
      setSaveError(t('calendar.charts.commentError'))
      toast({
        title: t('error'),
        description: t('calendar.charts.commentError'),
        variant: "destructive",
      })
    } finally {
      setIsSavingComment(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-base md:text-lg">
          {t('calendar.charts.dailyComment')}
        </CardTitle>
        <CardDescription className="text-xs md:text-sm">
          {t('calendar.charts.addComment')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Textarea
            placeholder={t('calendar.charts.dailyCommentPlaceholder')}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className={cn(
              "min-h-[100px] resize-none",
              isSavingComment && "opacity-50",
              saveError && "border-destructive"
            )}
            disabled={!selectedMood || isSavingComment}
          />
          <div className="flex items-center justify-between">
            {isSavingComment && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('calendar.charts.saving')}
              </div>
            )}
            {saveError && (
              <p className="text-sm text-destructive">
                {saveError}
              </p>
            )}
            {!selectedMood && (
              <p className="text-sm text-muted-foreground">
                {t('calendar.charts.selectMoodFirst')}
              </p>
            )}
            <Button
              onClick={handleSaveComment}
              disabled={!selectedMood || isSavingComment || !comment.trim()}
              size="sm"
            >
              {t('calendar.charts.saveComment')}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 