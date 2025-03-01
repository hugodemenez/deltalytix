'use client'

import { useI18n } from '@/locales/client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

interface AuthPromptProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  action?: string
}

export function AuthPrompt({ open, onOpenChange, action = 'perform this action' }: AuthPromptProps) {
  const t = useI18n()
  const router = useRouter()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('auth.required')}</DialogTitle>
          <DialogDescription>
            {t('auth.signInRequired', { action })}
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={() => router.push('/authentication?next=/community')}>
            {t('auth.signIn')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 