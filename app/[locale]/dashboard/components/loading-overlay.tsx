import React from 'react'
import { Loader2 } from 'lucide-react'
import { useI18n } from "@/locales/client"

export default function LoadingOverlay() {
  const t = useI18n()
  
  return (
    <div className="fixed bottom-4 right-4 z-40 flex items-center gap-2 px-3 py-2 rounded-md bg-background/95 shadow-sm border">
      <Loader2 className="w-4 h-4 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">{t('loading.trades')}</p>
    </div>
  )
}