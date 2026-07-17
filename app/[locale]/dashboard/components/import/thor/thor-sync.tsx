'use client'

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CopyIcon, RefreshCwIcon, EyeIcon } from "lucide-react"
import { useState } from "react"
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

const fieldClassName =
  'h-11 flex-1 rounded-sm border-black/10 bg-transparent font-mono text-sm shadow-none focus-visible:border-black/30 focus-visible:ring-0 focus-visible:ring-offset-0 dark:border-white/10 dark:focus-visible:border-white/30'

const iconButtonClassName =
  'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-sm border border-black/20 bg-transparent text-black/55 shadow-none transition-[opacity,transform,background-color,color] duration-150 hover:bg-black/5 hover:text-black active:scale-[0.96] disabled:pointer-events-none disabled:opacity-40 dark:border-white/20 dark:text-white/55 dark:hover:bg-white/5 dark:hover:text-white'

export function ThorSync({ setIsOpen: _setIsOpen }: { setIsOpen: (isOpen: boolean) => void }) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [isRevealed, setIsRevealed] = useState(false)
  const user = useUserStore((state) => state.user)
  const setUser = useUserStore((state) => state.setUser)
  const t = useI18n()

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
    } catch {
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
    <div className="flex flex-col space-y-4">
      <div className="flex gap-2">
        {isGenerating ? (
          <Skeleton className="h-11 w-full rounded-sm" />
        ) : (
          <Input
            value={isRevealed ? (user?.thorToken || '') : getMaskedToken()}
            readOnly
            placeholder={t('thor.noToken')}
            className={fieldClassName}
          />
        )}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={!user?.thorToken || isGenerating}
              className={iconButtonClassName}
              aria-label={t('thor.revealToken')}
            >
              <EyeIcon className="h-4 w-4" strokeWidth={1.75} />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="rounded-sm border-black/10 dark:border-white/10">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-normal tracking-tight">
                {t('thor.revealToken')}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-black/55 dark:text-white/55">
                {t('thor.revealWarning')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => setIsRevealed(false)}
                className="rounded-sm"
              >
                {t('thor.cancel')}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => setIsRevealed(true)}
                className="rounded-sm"
              >
                {t('thor.reveal')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleCopyToken}
          disabled={!user?.thorToken || isGenerating}
          className={iconButtonClassName}
          aria-label={t('common.copy')}
        >
          <CopyIcon className="h-4 w-4" strokeWidth={1.75} />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => void handleGenerateToken()}
          disabled={isGenerating}
          className={iconButtonClassName}
        >
          <RefreshCwIcon
            className={cn('h-4 w-4', { 'animate-spin': isGenerating })}
            strokeWidth={1.75}
          />
        </Button>
      </div>

      <p className="text-sm leading-relaxed text-black/45 dark:text-white/45">
        {t('thor.invalidation')}
      </p>
    </div>
  )
}
