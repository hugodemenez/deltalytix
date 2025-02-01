'use client'
import { notFound } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { format } from "date-fns"
import { fr, enUS } from 'date-fns/locale'
import { Trade } from "@prisma/client"
import { getShared } from "@/server/shared"
import { useUserData, UserDataProvider } from "@/components/context/user-data"
import { SharedWidgetCanvas } from "./shared-widget-canvas"
import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { LanguageSelector } from "@/components/ui/language-selector"
import { useI18n } from "@/locales/client"
import { useParams } from "next/navigation"
import { Loader2 } from "lucide-react"

interface SharedPageProps {
  params: {
    slug: string
  }
}

// Create a client component for the accounts selection
function AccountsSelector({ accounts }: { accounts: string[] }) {
  const { accountNumbers, setAccountNumbers } = useUserData()
  const t = useI18n()

  const toggleAccount = (account: string) => {
    if (accountNumbers.includes(account)) {
      setAccountNumbers(accountNumbers.filter((a: string) => a !== account))
    } else {
      setAccountNumbers([...accountNumbers, account])
    }
  }

  const toggleAll = () => {
    if (accountNumbers.length === accounts.length) {
      setAccountNumbers([])
    } else {
      setAccountNumbers([...accounts])
    }
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium">{t('shared.tradingAccounts')}</p>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={toggleAll}
          className="h-7 text-xs"
        >
          {accountNumbers.length === accounts.length ? t('shared.deselectAll') : t('shared.selectAll')}
        </Button>
      </div>
      <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
        {accounts.map((account) => (
          <button
            key={account}
            onClick={() => toggleAccount(account)}
            className={cn(
              "flex items-center p-2 rounded-md border transition-colors hover:bg-muted/50",
              accountNumbers.includes(account) 
                ? "bg-primary/10 border-primary/50" 
                : "bg-background border-border"
            )}
          >
            <div className={cn(
              "h-2 w-2 rounded-full mr-2",
              accountNumbers.includes(account) 
                ? "bg-primary" 
                : "bg-muted-foreground/30"
            )} />
            <span className="text-sm font-medium truncate" title={account}>
              {account}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

function TopBanner({ languages, t }: { languages: { value: string; label: string }[]; t: any }) {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b shadow-sm h-[60px]">
      <div className="w-full mx-auto h-full py-3 px-4 md:px-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
        <div className="flex items-center gap-x-4">
          <Logo className="fill-black h-6 w-6 dark:fill-white" />
          <div className="flex flex-col">
            <h1 className="font-semibold">Deltalytix</h1>
            <p className="text-sm text-muted-foreground">{t('shared.tagline')}</p>
          </div>
        </div>
        <div className="flex items-center gap-x-2 sm:gap-x-4">
          <LanguageSelector
            languages={languages}
            className="w-[110px]"
            triggerClassName="h-8"
          />
          <Link href="/authentication" className="flex-1 sm:flex-none">
            <Button size="sm" className="bg-primary hover:bg-primary/90 w-full">
              {t('shared.createAccount')}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

// Main page component
export default function SharedPage({ params }: SharedPageProps) {
  const languages = [
    { value: 'en', label: 'English' },
    { value: 'fr', label: 'Français' },
  ]

  const t = useI18n()
  const routeParams = useParams()
  const locale = (routeParams?.locale as string) || 'en'
  const dateLocale = locale === 'fr' ? fr : enUS
  const { isLoading, sharedParams } = useUserData()

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <TopBanner languages={languages} t={t} />
        <div className="w-full mx-auto flex-1 flex items-center justify-center pt-[60px]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t('shared.loading')}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!sharedParams) {
    return (
      <div className="flex flex-col min-h-screen">
        <TopBanner languages={languages} t={t} />
        <div className="w-full mx-auto flex-1 flex items-center justify-center p-4 pt-[76px]">
          <Card className="max-w-lg w-full">
            <CardHeader>
              <CardTitle>{t('shared.notFound')}</CardTitle>
              <CardDescription>
                {t('shared.notFoundDescription')}
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    )
  }

  // Check if the share has expired
  if (sharedParams.expiresAt && new Date() > new Date(sharedParams.expiresAt)) {
    return (
      <div className="flex flex-col min-h-screen">
        <TopBanner languages={languages} t={t} />
        <div className="w-full mx-auto flex-1 flex items-center justify-center p-4 pt-[76px]">
          <Card className="max-w-lg w-full">
            <CardHeader>
              <CardTitle>{t('shared.expired')}</CardTitle>
              <CardDescription>
                {t('shared.expiredDescription')}
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    )
  }

  const dateRange = sharedParams.dateRange as { from: Date; to: Date }

  return (
    <div className="flex flex-col min-h-screen">
      <TopBanner languages={languages} t={t} />
      <div className="w-full mx-auto px-8 flex-1 pt-[60px]">
        <main className="w-full py-6 lg:py-8">
          <Card className="mb-6">
            <CardHeader className="space-y-3">
              <div className="flex flex-col space-y-2">
                <CardTitle className="text-xl sm:text-2xl">
                  {sharedParams.title || t('shared.title')}
                </CardTitle>
                <CardDescription className="text-sm sm:text-base">
                  {sharedParams.description || t('shared.description')}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <Card className="p-4 border-none shadow-none bg-muted/50">
                  <p className="text-sm font-medium mb-1">{t('shared.sharedOn')}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(sharedParams.createdAt || new Date()), "PPP", { locale: dateLocale })}
                  </p>
                </Card>
                <Card className="p-4 border-none shadow-none bg-muted/50">
                  <p className="text-sm font-medium mb-1">{t('shared.dateRange')}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(dateRange.from), "PPP", { locale: dateLocale })}
                    {dateRange.to && (
                      <>
                        {" - "}
                        {format(new Date(dateRange.to), "PPP", { locale: dateLocale })}
                      </>
                    )}
                  </p>
                </Card>
              </div>
              
              <Card className="p-4 border-none shadow-none bg-muted/50">
                <AccountsSelector accounts={sharedParams.accountNumbers} />
              </Card>
            </CardContent>
          </Card>

          <SharedWidgetCanvas layout={{
            desktop: sharedParams.desktop || [],
            mobile: sharedParams.mobile || []
          }} />
        </main>
      </div>
    </div>
  )
}