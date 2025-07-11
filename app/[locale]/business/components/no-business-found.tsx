'use client'

import { useI18n } from '@/locales/client'

export function NoBusinessFound() {
  const t = useI18n()

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold mb-4">{t('business.dashboard.noBusiness.title')}</h1>
        <p className="text-muted-foreground mb-6">
          {t('business.dashboard.noBusiness.description')}
        </p>
        <div className="space-x-4">
          <a 
            href="/business/manage" 
            className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            {t('business.dashboard.noBusiness.manageButton')}
          </a>
          <a 
            href="/business/manage" 
            className="inline-flex items-center px-4 py-2 border border-input bg-background rounded-md hover:bg-accent hover:text-accent-foreground"
          >
            {t('business.dashboard.noBusiness.createButton')}
          </a>
        </div>
      </div>
    </div>
  )
} 