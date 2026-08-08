'use client'

import { Line, LineChart, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts"
import { ChartContainer } from "@/components/ui/chart"
import { cn } from "@/lib/utils"
import { useCurrentLocale, useI18n } from "@/locales/client"
import { useMemo } from "react"
import { Account } from "@/context/data-provider"
import { useTradesStore } from "@/store/trades-store"
import { WidgetSize } from "../../types/dashboard"
import {
  WidgetChartGrid,
  WidgetEmpty,
  WidgetTooltip,
  WidgetZeroLine,
  axisProps,
  chartColors,
  chartMargin,
  formatCompactCurrency,
  formatCurrency,
  formatTicks,
  pnlTone,
  pnlToneClass,
  widgetType,
} from "../widgets"

// Add interface for event type
interface ChartEvent {
  date: Date
  amount: number
  isPayout: boolean
  isReset?: boolean
  payoutStatus?: string
}

interface ChartDataPoint {
  tradeIndex: number
  date: string
  balance: number
  drawdownLevel: number
  highestBalance: number
  target: number
  pnl: number
  isPayout?: boolean
  isReset?: boolean
  payoutStatus?: string
  payoutAmount: number
}

interface TradeProgressChartProps {
  account: Account
  className?: string
  fillHeight?: boolean
  size?: WidgetSize
}

/**
 * A payout's status is genuine state, so it earns a color — but the status word
 * always travels with it in the tooltip, so the color is never the only signal.
 */
function payoutColor(status: string): string {
  switch (status) {
    case 'PAID': return chartColors.win
    case 'REFUSED': return chartColors.loss
    case 'VALIDATED': return chartColors.foreground
    default: return chartColors.neutral
  }
}

export function TradeProgressChart({
  account,
  className,
  fillHeight = false,
  size = 'medium',
}: TradeProgressChartProps) {
  const t = useI18n()
  const locale = useCurrentLocale()

  // Prefer filtered trades from account (buffer-aware), fallback to store
  const allTrades = useTradesStore(state => state.trades)
  const trades = useMemo(() => {
    if (account.trades && account.trades.length > 0) return account.trades
    return allTrades.filter(trade => trade.accountNumber === account.number)
  }, [allTrades, account.trades, account.number])

  // Three series: the balance is the subject, the two boundaries are the
  // thresholds it is measured against. Colors come from theme tokens so the
  // chart survives the theme swap without a `darkMode` branch.
  const chartConfig = {
    balance: {
      label: t('propFirm.chart.balance'),
      color: chartColors.foreground,
    },
    drawdown: {
      label: t('propFirm.chart.drawdownLevel'),
      color: chartColors.loss,
    },
    target: {
      label: t('propFirm.chart.profitTarget'),
      color: chartColors.win,
    },
    payout: {
      label: t('propFirm.chart.payout'),
      color: chartColors.neutral,
    }
  }

  // Extract account properties
  const {
    startingBalance,
    drawdownThreshold,
    profitTarget,
    trailingDrawdown = false,
    trailingStopProfit,
    payouts = [],
    resetDate
  } = account

  // Create combined events array with trades, payouts, and resets
  const allEvents: ChartEvent[] = [
    ...trades.map(trade => ({
      date: new Date(trade.entryDate),
      amount: trade.pnl - (trade.commission || 0),
      isPayout: false,
      isReset: false
    })),
    ...payouts.map(payout => ({
      date: new Date(payout.date),
      amount: ['PENDING', 'VALIDATED', 'PAID'].includes(payout.status) ? -payout.amount : 0,
      isPayout: true,
      isReset: false,
      payoutStatus: payout.status
    })),
    ...(resetDate ? [{
      date: new Date(resetDate),
      amount: 0, // Reset doesn't change balance directly, it sets it to starting balance
      isPayout: false,
      isReset: true
    }] : [])
  ].sort((a, b) => a.date.getTime() - b.date.getTime())

  // Process events to create chart data
  const chartData = allEvents.reduce((acc, event, index) => {
    let balance: number
    let highestBalance: number

    if (event.isReset) {
      // Reset the balance to starting balance
      balance = startingBalance
      highestBalance = startingBalance
    } else {
      const prevBalance = index > 0 ? acc[index - 1].balance : startingBalance
      balance = prevBalance + event.amount

      // Calculate highest balance up to this point
      const previousHighest = index > 0 ? acc[index - 1].highestBalance : startingBalance
      highestBalance = event.isPayout ? previousHighest : Math.max(previousHighest, balance)
    }

    // Calculate drawdown level based on trailing or fixed drawdown
    let drawdownLevel
    if (trailingDrawdown) {
      const profitMade = Math.max(0, highestBalance - startingBalance)

      // If we've hit trailing stop profit, lock the drawdown to that level
      if (trailingStopProfit && profitMade >= trailingStopProfit) {
        drawdownLevel = (startingBalance + trailingStopProfit) - drawdownThreshold
      } else {
        // Otherwise, drawdown level trails the highest balance
        drawdownLevel = highestBalance - drawdownThreshold
      }
    } else {
      // Fixed drawdown - always relative to starting balance
      drawdownLevel = startingBalance - drawdownThreshold
    }

    return [...acc, {
      tradeIndex: index + 1,
      date: event.date.toLocaleDateString(),
      balance,
      drawdownLevel,
      highestBalance,
      target: startingBalance + profitTarget,
      pnl: event.isReset ? 0 : (event.isPayout ? 0 : event.amount),
      isPayout: event.isPayout,
      isReset: event.isReset,
      payoutStatus: event.payoutStatus,
      payoutAmount: event.isPayout ? -event.amount : 0
    }]
  }, [] as ChartDataPoint[])

  const renderDot = (props: any) => {
    const { cx, cy, payload, index } = props
    if (typeof cx !== 'number' || typeof cy !== 'number') {
      return <circle key={`dot-${index}-empty`} cx={cx} cy={cy} r={0} fill="none" />
    }

    if (payload?.isReset) {
      return (
        <circle
          key={`dot-${index}-reset`}
          cx={cx}
          cy={cy}
          r={5}
          fill={chartColors.primary}
          stroke="hsl(var(--card))"
          strokeWidth={2}
        />
      )
    }

    if (payload?.isPayout) {
      return (
        <circle
          key={`dot-${index}-payout`}
          cx={cx}
          cy={cy}
          r={4}
          fill={payoutColor(payload.payoutStatus || '')}
          stroke="hsl(var(--card))"
          strokeWidth={1}
        />
      )
    }

    return <circle key={`dot-${index}-empty`} cx={cx} cy={cy} r={0} fill="none" />
  }

  return (
    <div
      className={cn(
        "w-full",
        fillHeight ? "flex min-h-0 flex-1 flex-col gap-1.5" : "flex flex-col gap-1.5"
      )}
    >
      <ChartContainer
        config={chartConfig}
        className={cn(
          fillHeight ? "min-h-[120px] w-full flex-1" : "h-[200px] w-full",
          className
        )}
      >
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={chartMargin(size)}>
              <WidgetChartGrid />
              <XAxis
                dataKey="tradeIndex"
                {...axisProps(size)}
                tick={false}
              />
              <YAxis
                {...axisProps(size)}
                width={52}
                tickFormatter={(value: number) => formatCompactCurrency(value, locale)}
                domain={[
                  (dataMin: number) => Math.floor(Math.min(dataMin, startingBalance - drawdownThreshold) / 1000) * 1000,
                  (dataMax: number) => Math.ceil(Math.max(dataMax, startingBalance + profitTarget) / 1000) * 1000
                ]}
              />
              <Tooltip
                cursor={{ stroke: chartColors.grid, strokeWidth: 1, strokeDasharray: '3 3' }}
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null
                  const data = payload[0].payload as ChartDataPoint
                  const rows = [
                    {
                      label: t('propFirm.chart.balance'),
                      value: formatCurrency(data.balance, locale),
                    },
                    ...(!data.isPayout && !data.isReset
                      ? [{
                          label: t('propFirm.dailyStats.pnl'),
                          value: formatCurrency(data.pnl, locale, { signDisplay: 'always' as const }),
                          toneClassName: pnlToneClass(pnlTone(data.pnl)),
                        }]
                      : []),
                    {
                      label: t('propFirm.chart.drawdownLevel'),
                      value: formatCurrency(data.drawdownLevel, locale),
                      color: chartColors.loss,
                    },
                    ...(data.isPayout && data.payoutStatus
                      ? [{
                          label: `${t('propFirm.chart.payout')} (${data.payoutStatus.toLowerCase()})`,
                          value: formatCurrency(data.payoutAmount, locale),
                          color: payoutColor(data.payoutStatus),
                        }]
                      : []),
                  ]
                  const highestBalanceCaption = t('propFirm.chart.highestBalance', {
                    amount: formatTicks(data.highestBalance, locale, { maximumFractionDigits: 2 }),
                  })
                  return (
                    <WidgetTooltip
                      title={`${t('propFirm.chart.tradeNumber', { number: data.tradeIndex })} · ${data.date}`}
                      rows={rows}
                      caption={
                        data.isReset
                          ? `${highestBalanceCaption} · ${t('propFirm.chart.accountReset')}`
                          : highestBalanceCaption
                      }
                    />
                  )
                }}
              />
              <Line
                type="monotone"
                dataKey="balance"
                name={t('propFirm.chart.balance')}
                stroke={chartConfig.balance.color}
                strokeWidth={2}
                dot={renderDot}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="drawdownLevel"
                name={t('propFirm.chart.drawdownLevel')}
                stroke={chartConfig.drawdown.color}
                strokeWidth={1.5}
                strokeDasharray="3 3"
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="target"
                name={t('propFirm.chart.profitTarget')}
                stroke={chartConfig.target.color}
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                isAnimationActive={false}
              />
              {/* The honest baseline for this chart is the starting balance, not
                  screen zero: every level above is profit, every level below is
                  drawdown. It is stated in the caption, not only drawn. */}
              <WidgetZeroLine y={startingBalance} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <WidgetEmpty message={t('propFirm.chart.noTrades')} />
        )}
      </ChartContainer>
      <p className={widgetType.caption}>
        {t('propFirm.chart.startingBalance')}: {formatCurrency(startingBalance, locale)}
      </p>
    </div>
  )
}
