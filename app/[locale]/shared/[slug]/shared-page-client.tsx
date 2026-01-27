'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { format } from "date-fns"
import { useData } from "@/context/data-provider"
import { SharedWidgetCanvas } from "./shared-widget-canvas"
import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { useI18n } from "@/locales/client"
import { Loader2, ChevronDown } from "lucide-react"
import { useEffect, useState } from "react"
import { SharedParams } from "@/server/shared"
import { Trade } from "@/prisma/generated/prisma/browser"
import { LanguageSelector } from "@/components/ui/language-selector"

interface SharedPageClientProps {
  params: {
    locale: string;
    slug: string;
  }
  initialData: {
    params: SharedParams;
    trades: Trade[];
  }
}

// Create a client component for the accounts selection
function AccountsSelector({ accounts }: { accounts: string[] }) {
  const { accountNumbers, setAccountNumbers } = useData()
  const t = useI18n()
  const [isExpanded, setIsExpanded] = useState(false)
  const visibleAccounts = isExpanded ? accounts : accounts.slice(0, 2)
  const remainingAccounts = accounts.length - 2

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
      <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2 xs:gap-0 mb-2">
        <p className="text-sm font-medium">{t('shared.tradingAccounts')}</p>
        <div className="flex flex-wrap items-center gap-1.5 w-full xs:w-auto justify-end">
          {accounts.length > 2 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-7 text-xs gap-1 min-w-0"
            >
              {isExpanded 
                ? t('shared.showLessAccounts')
                : t('shared.showMoreAccounts', { count: remainingAccounts })}
              <ChevronDown className={cn(
                "h-3 w-3 transition-transform shrink-0",
                isExpanded ? "rotate-180" : ""
              )} />
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="sm"
            onClick={toggleAll}
            className="h-7 text-xs whitespace-nowrap min-w-0"
          >
            {accountNumbers.length === accounts.length ? t('shared.deselectAll') : t('shared.selectAll')}
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5 xs:gap-2">
        {visibleAccounts.map((account) => (
          <button
            key={account}
            onClick={() => toggleAccount(account)}
            className={cn(
              "flex items-center p-1.5 xs:p-2 rounded-md border transition-colors hover:bg-muted/50",
              accountNumbers.includes(account) 
                ? "bg-primary/10 border-primary/50" 
                : "bg-background border-border"
            )}
          >
            <div className={cn(
              "h-2 w-2 rounded-full mr-1.5 xs:mr-2 shrink-0",
              accountNumbers.includes(account) 
                ? "bg-primary" 
                : "bg-muted-foreground/30"
            )} />
            <span className="text-xs xs:text-sm font-medium truncate" title={account}>
              {account}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

function TopBanner({ t }: { t: any }) {
  const languages = [
    { value: 'en', label: 'English' },
    { value: 'fr', label: 'Français' },
  ]

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b shadow-xs">
      <div className="w-full mx-auto py-3 px-4 md:px-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-x-4">
            <Logo className="fill-black h-6 w-6 dark:fill-white" />
            <div className="flex flex-col">
              <h1 className="font-semibold">Deltalytix</h1>
              <p className="text-sm text-muted-foreground">{t('shared.tagline')}</p>
            </div>
          </div>
          <div className="flex items-center gap-x-2 sm:gap-x-4 pb-2 sm:pb-0">
            <LanguageSelector languages={languages} />
            <Link href="/authentication" className="flex-1 sm:flex-none">
              <Button size="sm" className="bg-primary hover:bg-primary/90 w-full">
                {t('shared.createAccount')}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export function SharedPageClient({ params, initialData }: SharedPageClientProps) {
  const t = useI18n()
  const { isLoading, sharedParams, setSharedParams, setAccountNumbers } = useData()

  // Hydrate the initial data
  useEffect(() => {
    if (initialData) {
      // If accountNumbers is empty, deduce them from trades
      const deducedAccountNumbers = initialData.params.accountNumbers.length === 0
        ? Array.from(new Set(initialData.trades.map(trade => trade.accountNumber)))
        : initialData.params.accountNumbers

      // Update both sharedParams and accountNumbers
      setSharedParams({
        ...initialData.params,
        accountNumbers: deducedAccountNumbers
      })
      
      // Initialize accountNumbers with all accounts
      setAccountNumbers(deducedAccountNumbers)
    }
  }, [initialData, setSharedParams, setAccountNumbers])

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <TopBanner t={t} />
        <div className="w-full mx-auto flex-1 flex items-center justify-center pt-[120px] sm:pt-[60px]">
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
        <TopBanner t={t} />
        <div className="w-full mx-auto flex-1 flex items-center justify-center p-4 pt-[120px] sm:pt-[76px]">
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

  const dateRange = sharedParams.dateRange as { from: Date; to: Date }

  return (
    <div className="flex flex-col min-h-screen">
      <TopBanner t={t} />
      <div className="w-full mx-auto px-8 flex-1 pt-[120px] sm:pt-[60px]">
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
                    {format(new Date(sharedParams.createdAt || new Date()), "PPP")}
                  </p>
                </Card>
                <Card className="p-4 border-none shadow-none bg-muted/50">
                  <p className="text-sm font-medium mb-1">
                    {dateRange.to ? t('shared.period') : t('shared.since')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {dateRange.to ? (
                      <>
                        {format(new Date(dateRange.from), "PPP")}
                        {" - "}
                        {format(new Date(dateRange.to), "PPP")}
                      </>
                    ) : (
                      format(new Date(dateRange.from), "PPP")
                    )}
                  </p>
                </Card>
              </div>
              
              <Card className="p-4 border-none shadow-none bg-muted/50">
                <AccountsSelector accounts={sharedParams.accountNumbers} />
              </Card>
            </CardContent>
          </Card>

          <SharedWidgetCanvas />
        </main>
      </div>
    </div>
  )
} 