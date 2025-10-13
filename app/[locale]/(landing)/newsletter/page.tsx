import { Metadata } from "next"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2 } from "lucide-react"
import { getScopedI18n } from "@/locales/server"

export const metadata: Metadata = {
  title: "Newsletter Preferences | Delatlytix",
  description: "Manage your newsletter preferences and subscription settings",
}

export default async function NewsletterPage(
  props: {
    searchParams: Promise<{ [key: string]: string | undefined }>
  }
) {
  const searchParams = await props.searchParams;
  const t = await getScopedI18n('newsletter')

  const isUnsubscribed = searchParams?.status === "unsubscribed"
  const email = searchParams?.email

  return (
    <main className="min-h-[calc(100vh-4rem)] flex items-start">
      <div className="container max-w-6xl w-full px-4 sm:px-6 py-6 sm:py-8 md:py-12">
        <div className="mx-auto max-w-2xl space-y-6 sm:space-y-8">
          {isUnsubscribed && (
            <Card className="border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/50">
              <CardHeader className="space-y-3 sm:space-y-4">
                <div className="flex items-center space-x-2.5">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
                  <CardTitle className="text-lg sm:text-xl">{t("unsubscribed.title")}</CardTitle>
                </div>
                <CardDescription className="text-green-700 dark:text-green-300 text-sm sm:text-base">
                  {t("unsubscribed.description")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm sm:text-base text-green-600 dark:text-green-400 break-all">
                  {email && `${t("unsubscribed.email")}: ${email}`}
                </p>
              </CardContent>
            </Card>
          )}

          <Card className="shadow-xs">
            <CardHeader className="space-y-3 sm:space-y-4">
              <CardTitle className="text-lg sm:text-xl">{t("preferences.title")}</CardTitle>
              <CardDescription className="text-sm sm:text-base">{t("preferences.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm sm:text-base text-muted-foreground">
                {t("preferences.comingSoon")}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}