'use client'

import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { useCurrentLocale, useI18n } from "@/locales/client"
import { TradeProgressChart } from "./trade-progress-chart"
import { Account } from "@/context/data-provider"
import { WidgetSize } from '../../types/dashboard'
import { Loader2 } from "lucide-react"
import {
  WidgetBody,
  WidgetCard,
  WidgetStat,
  WidgetStatList,
  formatCount,
  formatCurrency,
  formatTicks,
  isCompactSize,
  widgetHeaderPadding,
  widgetType,
} from "../widgets"

interface AccountCardProps {
  account: Account
  onClick?: () => void
  size?: WidgetSize
  layout?: 'default' | 'carousel'
  rithmicBalance?: number | null
  rithmicBalanceLoading?: boolean
  showRithmicBalance?: boolean
}

export function AccountCard({
  account,
  onClick,
  size = 'large',
  layout = 'default',
  rithmicBalance = null,
  rithmicBalanceLoading = false,
  showRithmicBalance = false,
}: AccountCardProps) {
  const t = useI18n()
  const locale = useCurrentLocale()

  // Extract metrics from account (computed server-side)
  const metrics = account.metrics
  const isConfigured = metrics?.isConfigured ?? false
  const currentBalance = metrics?.currentBalance ?? account.startingBalance ?? 0
  const remainingToTarget = metrics?.remainingToTarget ?? 0
  const progress = metrics?.progress ?? 0
  const drawdownProgress = metrics?.drawdownProgress ?? 0
  const remainingLoss = metrics?.remainingLoss ?? 0

  const isCarouselLayout = layout === 'carousel'
  const compact = isCompactSize(size)
  const showChart = size === 'large' || size === 'extra-large'
  const accountLabel = account.propfirm
    ? `${account.propfirm} (${account.number})`
    : account.number || t('propFirm.card.unnamedAccount')

  const daysToPayment = account.nextPaymentDate
    ? Math.floor((new Date(account.nextPaymentDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null
  const paymentIsImminent = daysToPayment !== null && daysToPayment < 5

  const isDrawdownBreached = remainingLoss <= 0

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!onClick) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onClick()
    }
  }

  return (
    /*
     * One card per account is real grouping: each account is a separate subject.
     * Inside it there are no more cards — the sections are separated by spacing
     * and by the one rule under the header.
     */
    <WidgetCard
      className={cn(
        "cursor-pointer motion-safe:transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        isCarouselLayout
          ? "h-full w-full max-w-full min-h-0"
          : compact
            ? "w-72"
            : "w-96"
      )}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? t("accounts.card.openAccount", { accountName: accountLabel }) : undefined}
      onClick={onClick}
      onKeyDown={handleKeyDown}
    >
      <div
        className={cn(
          "flex shrink-0 items-start justify-between gap-2 border-b",
          widgetHeaderPadding(size),
        )}
      >
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className={cn(widgetType.title, "truncate")}>
            {account.propfirm || t('propFirm.card.unnamedAccount')}
          </h3>
          {/* An account number is an operational identifier: mono is correct here. */}
          <span className={cn(widgetType.mono, "truncate text-muted-foreground")}>
            {account.number}
          </span>
        </div>
        {daysToPayment !== null && (
          <span
            className={cn(
              widgetType.caption,
              "shrink-0 text-right",
              paymentIsImminent && "text-destructive",
            )}
          >
            {formatCount(daysToPayment, locale)}
            {t('propFirm.card.daysBeforeNextPayment')}
          </span>
        )}
      </div>

      <WidgetBody
        size={size}
        className={cn(
          "flex flex-col gap-4",
          isCarouselLayout && "overflow-hidden",
        )}
      >
        <WidgetStatList>
          <WidgetStat
            label={t('propFirm.card.balance')}
            value={formatCurrency(currentBalance, locale)}
          />
          {showRithmicBalance && rithmicBalanceLoading && (
            <WidgetStat
              label={t('propFirm.card.rithmicBalance')}
              value={
                <span className="inline-flex items-center gap-1 font-normal text-muted-foreground">
                  <Loader2 aria-hidden className="h-3 w-3 motion-safe:animate-spin" />
                  {t('propFirm.card.rithmicBalanceLoading')}
                </span>
              }
            />
          )}
          {showRithmicBalance && !rithmicBalanceLoading && rithmicBalance != null && Number.isFinite(rithmicBalance) && (
            <WidgetStat
              label={t('propFirm.card.rithmicBalance')}
              value={formatCurrency(rithmicBalance, locale)}
            />
          )}
        </WidgetStatList>

        {isConfigured ? (
          <div
            className={cn(
              "flex flex-col gap-4",
              isCarouselLayout && "min-h-0 flex-1",
            )}
          >
            {/* Trade Progress Chart - only show for larger sizes */}
            {showChart && account.payouts && (
              <TradeProgressChart
                account={account}
                size={size}
                fillHeight={isCarouselLayout}
              />
            )}

            {/* Distance to the profit target. The bar encodes distance from a
                boundary, so the boundary itself is stated, not implied. */}
            <div className="flex flex-col gap-1.5">
              <WidgetStat
                label={t('propFirm.card.remainingToTarget')}
                value={formatCurrency(remainingToTarget, locale)}
              />
              <Progress
                value={progress}
                className={compact ? "h-1" : "h-1.5"}
                indicatorClassName="bg-foreground"
              />
              <span className={widgetType.caption}>
                {t('propFirm.card.target')}: {formatCurrency(account.profitTarget ?? 0, locale)}
              </span>
            </div>

            {/* Distance to the drawdown boundary. Color marks only the breach,
                which is a genuine state, and the words say so too. */}
            <div className="flex flex-col gap-1.5">
              <WidgetStat
                label={t('propFirm.card.drawdown')}
                value={
                  isDrawdownBreached
                    ? t('propFirm.card.drawdownBreached')
                    : t('propFirm.card.remainingLoss', { amount: formatTicks(remainingLoss, locale, { maximumFractionDigits: 2 }) })
                }
                toneClassName={isDrawdownBreached ? "text-destructive" : undefined}
              />
              <Progress
                value={drawdownProgress}
                className={compact ? "h-1" : "h-1.5"}
                indicatorClassName={isDrawdownBreached ? "bg-destructive" : "bg-foreground"}
              />
              <span className={widgetType.caption}>
                {t('propFirm.card.maxLoss', { amount: formatTicks(account.drawdownThreshold ?? 0, locale, { maximumFractionDigits: 2 }) })}
              </span>
            </div>

            {/* Consistency Section - only show for larger sizes */}
            {metrics && (size === 'large' || size === 'extra-large') && (
              <WidgetStatList>
                <WidgetStat
                  label={t('propFirm.card.consistency')}
                  value={
                    !metrics.hasProfitableData
                      ? t('propFirm.status.unprofitable')
                      : (metrics.isConsistent || account.consistencyPercentage === 100)
                        ? t('propFirm.status.consistent')
                        : t('propFirm.status.inconsistent')
                  }
                  toneClassName={cn(
                    !metrics.hasProfitableData && "text-muted-foreground",
                    metrics.hasProfitableData
                      && !(metrics.isConsistent || account.consistencyPercentage === 100)
                      && "text-destructive",
                  )}
                />
                <WidgetStat
                  label={t('propFirm.card.maxAllowedDailyProfit')}
                  value={
                    metrics.maxAllowedDailyProfit != null
                      ? formatCurrency(metrics.maxAllowedDailyProfit, locale)
                      : formatCurrency(0, locale)
                  }
                />
                <WidgetStat
                  label={t('propFirm.card.highestDailyProfit')}
                  value={formatCurrency(metrics.highestProfitDay ?? 0, locale)}
                />
                <WidgetStat
                  label={t('propFirm.card.tradingDays')}
                  value={
                    <>
                      {formatCount(metrics.validTradingDays, locale)}
                      {'/'}
                      {formatCount(metrics.totalTradingDays, locale)}
                      {account.minPnlToCountAsDay && account.minPnlToCountAsDay > 0 ? (
                        <span className={cn(widgetType.caption, "ml-1")}>
                          {`(≥${formatCurrency(account.minPnlToCountAsDay, locale)})`}
                        </span>
                      ) : null}
                    </>
                  }
                />
              </WidgetStatList>
            )}
          </div>
        ) : (
          <p className={widgetType.label}>
            {t('propFirm.card.needsConfiguration')}
          </p>
        )}
      </WidgetBody>
    </WidgetCard>
  )
}
