'use client'

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CopyIcon, RefreshCwIcon, EyeIcon } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { generateEtpToken } from "@/server/etp"
import { useToast } from "@/hooks/use-toast"
import { useUserData } from "@/components/context/user-data"
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

export function EtpSync({ setIsOpen }: { setIsOpen: (isOpen: boolean) => void }) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [isRevealed, setIsRevealed] = useState(false)
  const { toast } = useToast()
  const { etpToken, refreshUser } = useUserData()
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
      const result = await generateEtpToken()
      if (result.error) {
        toast({
          title: "Error",
          description: t('etp.error.generation'),
          variant: "destructive",
        })
        return
      }
      await refreshUser()
      toast({
        title: "Success",
        description: t('etp.generated'),
      })
    } catch (error) {
      toast({
        title: "Error",
        description: t('etp.error.generation'),
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopyToken = () => {
    if (!etpToken) return
    navigator.clipboard.writeText(etpToken)
    toast({
      title: "Success",
      description: t('etp.copied'),
    })
  }

  const getMaskedToken = () => {
    if (!etpToken) return ''
    return '•'.repeat(etpToken.length)
  }

  return (
    <div className="flex flex-col space-y-4 p-6">
      <div className="flex flex-col space-y-2">
        <h2 className="text-lg font-semibold">{t('etp.title')}</h2>
        <p className="text-sm text-muted-foreground">
          {t('etp.description')}
        </p>
      </div>

      <div className="flex space-x-2">
        {isGenerating ? (
          <Skeleton className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background" />
        ) : (
          <Input
            value={isRevealed ? (etpToken || '') : getMaskedToken()}
            readOnly
            placeholder={t('etp.noToken')}
            className="font-mono"
          />
        )}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              disabled={!etpToken || isGenerating}
            >
              <EyeIcon className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('etp.revealToken')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('etp.revealWarning')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setIsRevealed(false)}>{t('etp.cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={() => setIsRevealed(true)}>{t('etp.reveal')}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Button
          variant="outline"
          size="icon"
          onClick={handleCopyToken}
          disabled={!etpToken || isGenerating}
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
        <p>{t('etp.invalidation')}</p>
      </div>

      <div className="mt-8 space-y-4">
        <h2 className="text-2xl font-bold">{t('etp.tutorial.title')}</h2>
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
            <source src="/videos/etp-tutorial.mp4" type="video/mp4" />
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
          {t('etp.tutorial.description')}
        </p>
      </div>
    </div>
  )
}
