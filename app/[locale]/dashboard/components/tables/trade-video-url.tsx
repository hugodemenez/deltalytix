'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useI18n } from '@/locales/client'
import { updateTradeVideoUrlAction } from '@/server/database'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useData } from '@/context/data-provider'

interface TradeVideoUrlProps {
  tradeIds: string[]
  videoUrl: string | null
  onVideoUrlChange?: (videoUrl: string | null) => void
}

export function TradeVideoUrl({ tradeIds, videoUrl: initialVideoUrl, onVideoUrlChange }: TradeVideoUrlProps) {
  const t = useI18n()
  const { updateTrades } = useData()
  const [isOpen, setIsOpen] = useState(false)
  const [localUrl, setLocalUrl] = useState(initialVideoUrl || '')
  const [draftUrl, setDraftUrl] = useState(initialVideoUrl || '')
  const [isUpdating, setIsUpdating] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [isValid, setIsValid] = useState(true)
  const successTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  // Reset draft URL when modal opens
  useEffect(() => {
    if (isOpen) {
      setDraftUrl(localUrl)
      setIsValid(true)
    }
  }, [isOpen, localUrl])

  const validateUrl = (url: string) => {
    if (!url) return true
    try {
      new URL(url)
      return url.includes('youtube.com') || 
             url.includes('youtu.be') || 
             url.includes('tradingview.com') ||
             url.endsWith('.mp4') ||
             url.endsWith('.webm') ||
             url.endsWith('.mov')
    } catch {
      return false
    }
  }

  const getEmbedUrl = (url: string) => {
    if (!url) return ''
    try {
      const urlObj = new URL(url)
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        const videoId = url.includes('youtube.com') 
          ? urlObj.searchParams.get('v')
          : url.split('/').pop()
        return `https://www.youtube.com/embed/${videoId}?autoplay=1`
      }
      return url
    } catch {
      return url
    }
  }

  const handleUrlChange = (value: string) => {
    setDraftUrl(value)
    setIsValid(validateUrl(value))
  }

  const handleSave = async () => {
    if (!isValid) return
    
    setIsUpdating(true)
    try {
      await updateTrades(tradeIds, { videoUrl: draftUrl || null })
      setLocalUrl(draftUrl)
      onVideoUrlChange?.(draftUrl || null)
      setShowSuccess(true)
      successTimeoutRef.current = setTimeout(() => {
        setShowSuccess(false)
        setIsOpen(false)
      }, 1000)
    } catch (error) {
      console.error('Failed to update video URL:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleClear = async () => {
    setIsUpdating(true)
    try {
      await updateTrades(tradeIds, { videoUrl: null })
      setLocalUrl('')
      setDraftUrl('')
      onVideoUrlChange?.(null)
      setShowSuccess(true)
      successTimeoutRef.current = setTimeout(() => {
        setShowSuccess(false)
        setIsOpen(false)
      }, 1000)
    } catch (error) {
      console.error('Failed to clear video URL:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="max-w-[200px]">
      <Button
        variant="ghost"
        className={cn(
          "h-8 w-full justify-start px-2 gap-2 truncate",
          !localUrl && "text-muted-foreground font-normal"
        )}
        onClick={() => setIsOpen(true)}
      >
        {localUrl ? (
          <div className="truncate">
            {(() => {
              try {
                return new URL(localUrl).hostname
              } catch {
                return localUrl
              }
            })()}
          </div>
        ) : t('trade-table.addVideoUrl')}
      </Button>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('trade-table.videoUrl')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="relative flex-1">
                  <Input
                    placeholder="https://"
                    value={draftUrl}
                    onChange={(e) => handleUrlChange(e.target.value)}
                    className={cn(
                      "pr-8",
                      !isValid && draftUrl && "border-destructive focus-visible:ring-destructive",
                      showSuccess && "border-green-500 focus-visible:ring-green-500",
                      isUpdating && "border-primary/50"
                    )}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {isUpdating && (
                      <div className="h-4 w-4">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-r-transparent" />
                      </div>
                    )}
                    {showSuccess && !isUpdating && (
                      <svg
                        className="h-4 w-4 text-green-500"
                        xmlns="http://www.w3.org/2000/svg"
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
                    )}
                    {!isValid && draftUrl && !isUpdating && (
                      <svg
                        className="h-4 w-4 text-destructive"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  disabled={isUpdating || !draftUrl}
                  onClick={handleClear}
                  className="shrink-0 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              {!isValid && draftUrl && (
                <p className="text-sm text-destructive">
                  {t('trade-table.invalidVideoUrl')}
                </p>
              )}
              {draftUrl && isValid && (
                <div className="rounded-lg overflow-hidden border bg-muted">
                  <div className="aspect-video w-full relative">
                    <iframe
                      src={getEmbedUrl(draftUrl)}
                      className="absolute inset-0 w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      loading="lazy"
                      title="Video content"
                      sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setIsOpen(false)}
              disabled={isUpdating}
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleSave}
              disabled={!isValid || isUpdating}
            >
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 