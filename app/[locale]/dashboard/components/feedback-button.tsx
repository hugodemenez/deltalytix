'use client'

import { useState } from 'react'
import { MessageSquarePlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Textarea } from '@/components/ui/textarea'
import { useI18n } from '@/locales/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { submitFeedback, type FeedbackType } from '@/server/feedback'

const FEEDBACK_TYPES: FeedbackType[] = ['bug', 'feature', 'other']

export default function FeedbackButton() {
  const t = useI18n()

  const typeLabels: Record<FeedbackType, string> = {
    bug: t('feedback.type.bug'),
    feature: t('feedback.type.feature'),
    other: t('feedback.type.other'),
  }

  const [isOpen, setIsOpen] = useState(false)
  const [type, setType] = useState<FeedbackType>('bug')
  const [message, setMessage] = useState('')
  const [isPending, setIsPending] = useState(false)

  const handleSubmit = async () => {
    const trimmed = message.trim()
    if (!trimmed || isPending) return

    try {
      setIsPending(true)
      await submitFeedback({ type, message: trimmed })
      toast.success(t('feedback.success'))
      setMessage('')
      setType('bug')
      setIsOpen(false)
    } catch (error) {
      console.error('Failed to submit feedback:', error)
      toast.error(t('feedback.error'))
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 px-2 rounded-md hover:bg-accent hover:text-accent-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-colors relative"
          aria-label={t('feedback.title')}
        >
          <MessageSquarePlus className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="space-y-1">
            <h4 className="font-semibold text-lg">{t('feedback.heading')}</h4>
            <p className="text-sm text-muted-foreground">
              {t('feedback.description')}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {FEEDBACK_TYPES.map((feedbackType) => (
              <Button
                key={feedbackType}
                type="button"
                size="sm"
                variant={type === feedbackType ? 'default' : 'outline'}
                onClick={() => setType(feedbackType)}
                className={cn('h-8 flex-1 rounded-md text-xs')}
              >
                {typeLabels[feedbackType]}
              </Button>
            ))}
          </div>

          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t('feedback.placeholder')}
            maxLength={2000}
            rows={4}
            className="resize-none"
          />

          <Button
            type="button"
            className="w-full"
            onClick={handleSubmit}
            disabled={!message.trim() || isPending}
          >
            {isPending ? t('feedback.submitting') : t('feedback.submit')}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
