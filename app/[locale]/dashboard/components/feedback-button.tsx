'use client'

import { useRef, useState } from 'react'
import {
  MessageSquarePlusIcon,
  type MessageSquarePlusIconHandle,
} from '@/components/animated-icons/message-square-plus'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Textarea } from '@/components/ui/textarea'
import { useCurrentLocale, useI18n } from '@/locales/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { FEEDBACK_TYPES, type FeedbackType } from '@/lib/feedback'

export default function FeedbackButton() {
  const t = useI18n()
  const locale = useCurrentLocale()

  const typeLabels: Record<FeedbackType, string> = {
    bug: t('feedback.type.bug'),
    feature: t('feedback.type.feature'),
    other: t('feedback.type.other'),
  }

  const iconRef = useRef<MessageSquarePlusIconHandle>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [type, setType] = useState<FeedbackType>('bug')
  const [message, setMessage] = useState('')
  const [isPending, setIsPending] = useState(false)

  const handleSubmit = async () => {
    const trimmed = message.trim()
    if (!trimmed || isPending) return

    try {
      setIsPending(true)
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, message: trimmed, locale }),
      })
      if (!response.ok) {
        throw new Error(`Feedback request failed: ${response.status}`)
      }
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

  // Deliberate: self-hosted deployments have no one to send feedback to, so the
  // button is hidden rather than shown and useless. The PostHog token doubles as
  // the "this is a Deltalytix-operated deployment" signal.
  if (!process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN) return null

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 px-2 rounded-md hover:bg-accent hover:text-accent-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-colors relative"
              aria-label={t('feedback.title')}
              onMouseEnter={() => iconRef.current?.startAnimation()}
              onMouseLeave={() => iconRef.current?.stopAnimation()}
            >
              <MessageSquarePlusIcon ref={iconRef} className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>{t('feedback.tooltip')}</TooltipContent>
      </Tooltip>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="space-y-1">
            <h4 className="font-semibold text-lg">{t('feedback.heading')}</h4>
            <p className="text-sm text-muted-foreground">
              {t('feedback.description')}
            </p>
          </div>

          {/* Segmented control: role + aria-pressed so it is announced as one
              group of toggles rather than three unrelated buttons. */}
          <div
            role="group"
            aria-label={t('feedback.typeGroup')}
            className="flex items-center gap-2"
          >
            {FEEDBACK_TYPES.map((feedbackType) => (
              <Button
                key={feedbackType}
                type="button"
                size="sm"
                variant={type === feedbackType ? 'default' : 'outline'}
                aria-pressed={type === feedbackType}
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
