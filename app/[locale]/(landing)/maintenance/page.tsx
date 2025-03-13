import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { getI18n } from "@/locales/server"

export default async function MaintenancePage() {
  const t = await getI18n()

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            {t('maintenance.title')}
          </CardTitle>
          <CardDescription>
            {t('maintenance.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTitle>{t('maintenance.inMaintenance')}</AlertTitle>
            <AlertDescription>
              {t('maintenance.message')}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  )
} 