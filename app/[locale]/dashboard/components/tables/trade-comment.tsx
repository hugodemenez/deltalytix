'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Trash2, Save } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useI18n } from '@/locales/client'
import { updateTradeCommentAction } from '@/server/database'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useData } from '@/context/data-provider'

interface TradeCommentProps {
  tradeIds: string[]
  comment: string | null
  onCommentChange?: (comment: string | null) => void
}

export function TradeComment({ tradeIds, comment: initialComment, onCommentChange }: TradeCommentProps) {
  const t = useI18n()
  const { updateTrades } = useData()
  const [localComment, setLocalComment] = useState(initialComment || '')
  const [isUpdating, setIsUpdating] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [open, setOpen] = useState(false)

  // Sync localComment with comment prop
  useEffect(() => {
    setLocalComment(initialComment || '')
  }, [initialComment])

  const handleSave = async () => {
    setIsUpdating(true)
    try {
      // Update local state immediately
      const newComment = localComment || null
      
      // Update all trades in the list
      await updateTrades(tradeIds, { comment: newComment })

      
      setShowSuccess(true)
      setTimeout(() => {
        setShowSuccess(false)
      }, 1000)
      setOpen(false)
    } catch (error) {
      console.error('Failed to update comment:', error)
      // Revert local state on error
      setLocalComment(initialComment || '')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleClear = async () => {
    setIsUpdating(true)
    try {
      // Update local state immediately
      setLocalComment('')
      
      // Update all trades in the list
      await updateTrades(tradeIds, { comment: null })
      
      setShowSuccess(true)
      setTimeout(() => {
        setShowSuccess(false)
      }, 1000)
    } catch (error) {
      console.error('Failed to clear comment:', error)
      // Revert local state on error
      setLocalComment(initialComment || '')
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="max-w-[200px]">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div>
            <Button 
              variant="ghost" 
              className={cn(
                "h-8 w-full justify-start px-2 gap-2 truncate",
                !localComment && "text-muted-foreground font-normal"
              )}
            >
              {localComment ? (
                <div className="truncate">
                  {localComment}
                </div>
              ) : t('trade-table.addComment')}
            </Button>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-4" align="start" forceMount sideOffset={5}>
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <Label>{t('trade-table.comment')}</Label>
            </div>
            <div className="space-y-2">
              <div className="relative">
                <textarea
                  ref={inputRef}
                  placeholder={t('trade-table.addComment')}
                  value={localComment}
                  onChange={(e) => setLocalComment(e.target.value)}
                  className={cn(
                    "w-full px-3 py-2 text-sm bg-transparent border rounded min-h-[100px]",
                    "focus:outline-hidden focus:ring-2 focus:ring-primary resize-none transition-all duration-200",
                    showSuccess && "border-green-500 ring-2 ring-green-500/20",
                    isUpdating && "border-primary/50"
                  )}
                />
                {isUpdating && (
                  <div className="absolute right-2 top-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                  </div>
                )}
                {showSuccess && !isUpdating && (
                  <div className="absolute right-2 top-2 text-green-500 animate-in fade-in zoom-in duration-300">
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-between">
              <Button
                variant="outline"
                size="sm"
                disabled={isUpdating || !localComment}
                onClick={handleClear}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t('common.clear')}
              </Button>
              <Button
                size="sm"
                disabled={isUpdating}
                onClick={handleSave}
              >
                <Save className="h-4 w-4 mr-2" />
                {t('common.save')}
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
} 