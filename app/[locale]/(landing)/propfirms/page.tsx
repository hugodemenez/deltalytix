import { Metadata } from 'next'
import { getI18n } from '@/locales/server'
import { propFirms } from '@/app/[locale]/dashboard/components/accounts/config'
import { getPropfirmCatalogueData } from './actions/get-propfirm-catalogue'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AccountsBarChart } from './components/accounts-bar-chart'
import { SortControls } from './components/sort-controls'
import { TimeframeControls } from './components/timeframe-controls'
import type { Timeframe } from './actions/timeframe-utils'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getI18n()
  
  return {
    title: `${t('landing.propfirms.title')} - Deltalytix`,
    description: t('landing.propfirms.description'),
  }
}

// Format currency with $ symbol (always USD)
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function renderPropfirmCard(
  propfirmName: string,
  accountTemplatesCount: number,
  registeredAccountsCount: number,
  paidAmount: number,
  paidCount: number,
  pendingAmount: number,
  pendingCount: number,
  refusedAmount: number,
  refusedCount: number,
  t: any
) {
  return (
    <Card key={propfirmName} className="h-full">
      <CardHeader>
        <CardTitle className="text-xl">{propfirmName}</CardTitle>
        <div className="text-sm text-muted-foreground flex flex-wrap gap-2 mt-2">
          <Badge variant="outline">
            {registeredAccountsCount} {t('landing.propfirms.registeredAccounts')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold mb-3">{t('landing.propfirms.payouts.title')}</h3>
          <div className="space-y-3">
            {/* Paid - Highlighted */}
            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/30">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-green-900 dark:text-green-100">
                  {t('landing.propfirms.payouts.paid.label')}
                </span>
                <span className="text-sm font-bold text-green-700 dark:text-green-300">
                  {formatCurrency(paidAmount)}
                </span>
              </div>
              <p className="text-xs text-green-700/70 dark:text-green-300/70">
                {t('landing.propfirms.payouts.count', { count: paidCount })}
              </p>
            </div>

            {/* Pending */}
            <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900/30">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                  {t('landing.propfirms.payouts.pending.label')}
                </span>
                <span className="text-sm font-bold text-yellow-700 dark:text-yellow-300">
                  {formatCurrency(pendingAmount)}
                </span>
              </div>
              <p className="text-xs text-yellow-700/70 dark:text-yellow-300/70">
                {t('landing.propfirms.payouts.count', { count: pendingCount })}
              </p>
            </div>

            {/* Refused */}
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-red-900 dark:text-red-100">
                  {t('landing.propfirms.payouts.refused.label')}
                </span>
                <span className="text-sm font-bold text-red-700 dark:text-red-300">
                  {formatCurrency(refusedAmount)}
                </span>
              </div>
              <p className="text-xs text-red-700/70 dark:text-red-300/70">
                {t('landing.propfirms.payouts.count', { count: refusedCount })}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface PropFirmsPageProps {
  searchParams: Promise<{ sort?: string; timeframe?: string }>
}

export default async function PropFirmsPage({ searchParams }: PropFirmsPageProps) {
  const t = await getI18n()
  const resolvedSearchParams = await searchParams
  const timeframe = (resolvedSearchParams.timeframe || '2025') as Timeframe
  const sortBy = resolvedSearchParams.sort || 'accounts'
  const { stats } = await getPropfirmCatalogueData(timeframe)

  // Create a map of propfirm name -> stats for quick lookup
  const statsMap = new Map(
    stats.map(s => [s.propfirmName, s])
  )

  // Process config propfirms only
  const configPropfirms: Array<{
    key: string
    name: string
    accountTemplatesCount: number
    stats: typeof stats[0] | undefined
  }> = []

  Object.entries(propFirms).forEach(([key, firm]) => {
    const dbStats = statsMap.get(firm.name)
    const accountTemplatesCount = Object.keys(firm.accountSizes).length
    
    configPropfirms.push({
      key,
      name: firm.name,
      accountTemplatesCount,
      stats: dbStats,
    })
  })

  // Sort propfirms based on selected sort option
  const sortedPropfirms = [...configPropfirms].sort((a, b) => {
    const aStats = a.stats
    const bStats = b.stats
    
    switch (sortBy) {
      case 'paidPayout': {
        const aPaid = aStats?.payouts.paidAmount ?? 0
        const bPaid = bStats?.payouts.paidAmount ?? 0
        return bPaid - aPaid // Descending
      }
      case 'refusedPayout': {
        const aRefused = aStats?.payouts.refusedAmount ?? 0
        const bRefused = bStats?.payouts.refusedAmount ?? 0
        return bRefused - aRefused // Descending
      }
      case 'accounts':
      default: {
        const aAccounts = aStats?.accountsCount ?? 0
        const bAccounts = bStats?.accountsCount ?? 0
        return bAccounts - aAccounts // Descending
      }
    }
  })

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-16 max-w-7xl">
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-4">{t('landing.propfirms.title')}</h1>
          <p className="text-lg text-muted-foreground max-w-3xl">
            {t('landing.propfirms.description')}
          </p>
        </div>

        {/* Accounts bar chart */}
        <div className="mb-12">
          <AccountsBarChart
            data={sortedPropfirms.map(({ name, stats }) => ({
              propfirmName: name,
              accountsCount: stats?.accountsCount ?? 0,
            }))}
            chartTitle={t('landing.propfirms.chart.title')}
            accountsLabel={t('landing.propfirms.chart.accounts')}
            registeredAccountsLabel={t('landing.propfirms.registeredAccounts')}
          />
        </div>

        {/* Controls */}
        <div className="mb-6 flex justify-between items-center gap-4 flex-wrap">
          <TimeframeControls
            timeframeLabel={(t as any)('landing.propfirms.timeframe.label')}
            timeframeOptions={{
              currentMonth: (t as any)('landing.propfirms.timeframe.currentMonth'),
              last3Months: (t as any)('landing.propfirms.timeframe.last3Months'),
              last6Months: (t as any)('landing.propfirms.timeframe.last6Months'),
              '2024': (t as any)('landing.propfirms.timeframe.2024'),
              '2025': (t as any)('landing.propfirms.timeframe.2025'),
              allTime: (t as any)('landing.propfirms.timeframe.allTime'),
            }}
          />
          <SortControls
            sortLabel={(t as any)('landing.propfirms.sort.label')}
            sortOptions={{
              accounts: (t as any)('landing.propfirms.sort.accounts'),
              paidPayout: (t as any)('landing.propfirms.sort.paidPayout'),
              refusedPayout: (t as any)('landing.propfirms.sort.refusedPayout'),
            }}
          />
        </div>

        {/* Main propfirms grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedPropfirms.map(({ key, name, accountTemplatesCount, stats: dbStats }) => {
            const registeredAccountsCount = dbStats?.accountsCount ?? 0
            const payouts = dbStats?.payouts ?? {
              propfirmName: name,
              pendingAmount: 0,
              pendingCount: 0,
              refusedAmount: 0,
              refusedCount: 0,
              paidAmount: 0,
              paidCount: 0,
            }

            return renderPropfirmCard(
              name,
              accountTemplatesCount,
              registeredAccountsCount,
              payouts.paidAmount,
              payouts.paidCount,
              payouts.pendingAmount,
              payouts.pendingCount,
              payouts.refusedAmount,
              payouts.refusedCount,
              t
            )
          })}
        </div>
      </div>
    </div>
  )
}
