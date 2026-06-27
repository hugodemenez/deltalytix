'use client'
import { useI18n } from '@/locales/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function DisclaimersPage() {
  const t = useI18n()

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">{t('footer.legal.disclaimers')}</h1>
      
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('disclaimer.risk.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-line">
              {t('disclaimer.risk.content')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('disclaimer.hypothetical.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-line">
              {t('disclaimer.hypothetical.content')}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
