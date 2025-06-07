'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useI18n } from "@/locales/client"
import { useToast } from "@/hooks/use-toast"
import { CalendarEntry } from "@/app/[locale]/dashboard/types/calendar"
import { saveJournal, getMoodForDay } from '@/server/journal'
import { NoteEditor } from "@/app/[locale]/dashboard/components/mindset/note-editor"
import { format } from 'date-fns'
import { useUserStore } from '../../../../../store/user-store'

interface DailyCommentProps {
  dayData: CalendarEntry | undefined
  selectedDate: Date
}

interface Mood {
  id: string
  userId: string
  day: Date
  emotionValue: number
  hasTradingExperience: boolean | null
  selectedNews: string[]
  journalContent: string | null
  conversation: any
  createdAt: Date
  updatedAt: Date
}

export function DailyComment({ dayData, selectedDate }: DailyCommentProps) {
  const t = useI18n()
  const user = useUserStore(state => state.user)
  const moodHistory = useUserStore(state => state.moods)
  const setMoodHistory = useUserStore(state => state.setMoods)
  const { toast } = useToast()
  const [comment, setComment] = React.useState<string>("")
  const [isSavingComment, setIsSavingComment] = React.useState(false)
  const [saveError, setSaveError] = React.useState<string | null>(null)

  // Load comment from moodHistory or server on mount
  React.useEffect(() => {
    const loadComment = async () => {
      if (!user?.id) return

      try {
        const dateKey = format(selectedDate, 'yyyy-MM-dd')

        // First check moodHistory
        const moodForDate = moodHistory?.find(mood => {
          if (!mood?.day) return false
          const moodDate = mood.day instanceof Date ? mood.day : new Date(mood.day)
          return format(moodDate, 'yyyy-MM-dd') === dateKey
        })

        if (moodForDate?.journalContent) {
          setComment(moodForDate.journalContent)
          return
        }

        // If not in moodHistory, try to load from server
        const mood = await getMoodForDay(dateKey)
        if (mood) {
          const comment = mood.journalContent || ''
          setComment(comment)
        }
      } catch (error) {
        console.error('Error loading comment:', error)
      }
    }

    loadComment()
  }, [user?.id, selectedDate, moodHistory])

  const handleSaveComment = async () => {
    if (!user?.id) {
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
      const dateKey = format(selectedDate, 'yyyy-MM-dd')
      
      // Save to server
      const savedMood = await saveJournal(comment, dateKey)

      // Update the moodHistory in context
      const updatedMoodHistory = moodHistory?.filter(mood => {
        if (!mood?.day) return true
        const moodDate = mood.day instanceof Date ? mood.day : new Date(mood.day)
        const moodDateKey = format(moodDate, 'yyyy-MM-dd')
        return moodDateKey !== dateKey
      }) || []
      setMoodHistory([...updatedMoodHistory, savedMood])

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
          <div className={cn(
            "min-h-[200px]",
            isSavingComment && "opacity-50",
            saveError && "border-destructive"
          )}>
            <NoteEditor
              initialContent={comment}
              onChange={setComment}
              height="200px"
              width="100%"
            />
          </div>
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
            <Button
              onClick={handleSaveComment}
              disabled={isSavingComment || !comment.trim()}
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