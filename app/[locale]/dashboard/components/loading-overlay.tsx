import React from 'react'
import { Loader2 } from 'lucide-react'
import { useI18n } from "@/locales/client"

export default function LoadingOverlay() {
  const t = useI18n()
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="text-center flex flex-col items-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="mt-2 text-sm text-muted-foreground">{t('loading.trades')}</p>
      </div>
    </div>
  )
}