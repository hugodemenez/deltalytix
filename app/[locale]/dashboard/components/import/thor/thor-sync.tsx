'use client'

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CopyIcon, RefreshCwIcon, EyeIcon } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { generateThorToken } from "@/server/thor"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useI18n } from "@/locales/client"
import { useUserStore } from "../../../../../../store/user-store"

export function ThorSync({ setIsOpen }: { setIsOpen: (isOpen: boolean) => void }) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [isRevealed, setIsRevealed] = useState(false)
  const { user, setUser } = useUserStore.getState()
  const t = useI18n()
  const videoRef = useRef<HTMLVideoElement>(null)

  // Handle video playback
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    // Reset video state
    video.pause()
    video.currentTime = 0

    // Play video when component mounts
    const playVideo = () => {
      video.play().catch((error) => {
        console.error('Video playback error:', error)
      })
    }

    // Play video when it's ready
    if (video.readyState >= 2) {
      playVideo()
    } else {
      video.addEventListener('loadeddata', playVideo, { once: true })
    }

    // Cleanup
    return () => {
      if (video) {
        video.pause()
        video.removeEventListener('loadeddata', () => {})
      }
    }
  }, [])

  const handleGenerateToken = async () => {
    try {
      setIsGenerating(true)
      setIsRevealed(false)
      const result = await generateThorToken()
      if (result.error || !result.token) {
        toast.error(t('thor.error.generation'))
        return
      }
      if (!user) return
      setUser({ ...user, thorToken: result.token })
      toast.success(t('thor.generated'))
    } catch (error) {
      toast.error(t('thor.error.generation'))
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopyToken = () => {
    if (!user?.thorToken) return
    navigator.clipboard.writeText(user.thorToken)
    toast.success(t('thor.copied'))
  }

  const getMaskedToken = () => {
    if (!user?.thorToken) return ''
    return '•'.repeat(user.thorToken.length)
  }

  return (
    <div className="flex flex-col space-y-4 p-6">
      <div className="flex flex-col space-y-2">
        <h2 className="text-lg font-semibold">{t('thor.title')}</h2>
        <p className="text-sm text-muted-foreground">
          {t('thor.description')}
        </p>
      </div>

      <div className="flex space-x-2">
        {isGenerating ? (
          <Skeleton className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background" />
        ) : (
          <Input
            value={isRevealed ? (user?.thorToken || '') : getMaskedToken()}
            readOnly
            placeholder={t('thor.noToken')}
            className="font-mono"
          />
        )}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              disabled={!user?.thorToken || isGenerating}
            >
              <EyeIcon className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('thor.revealToken')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('thor.revealWarning')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setIsRevealed(false)}>{t('thor.cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={() => setIsRevealed(true)}>{t('thor.reveal')}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Button
          variant="outline"
          size="icon"
          onClick={handleCopyToken}
          disabled={!user?.thorToken || isGenerating}
        >
          <CopyIcon className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={handleGenerateToken}
          disabled={isGenerating}
        >
          <RefreshCwIcon className={cn("h-4 w-4", {
            "animate-spin": isGenerating
          })} />
        </Button>
      </div>

      <div className="text-sm text-muted-foreground">
        <p>{t('thor.invalidation')}</p>
      </div>

      <div className="mt-8 space-y-4">
        <h2 className="text-2xl font-bold">{t('thor.tutorial.title')}</h2>
        <div className="aspect-video rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 transition-transform duration-300 hover:scale-[1.02]">
          <video
            ref={videoRef}
            height="600"
            width="600"
            preload="metadata"
            loop
            muted
            controls
            playsInline
            className="rounded-lg border border-gray-200 dark:border-gray-800 shadow-lg w-full h-full object-cover"
          >
            <source src="/videos/thor-tutorial.mp4" type="video/mp4" />
            <track
              src="/path/to/captions.vtt"
              kind="subtitles"
              srcLang="en"
              label="English"
            />
            Your browser does not support the video tag.
          </video>
        </div>
        <p className="text-sm text-muted-foreground">
          {t('thor.tutorial.description')}
        </p>
      </div>
    </div>
  )
} 