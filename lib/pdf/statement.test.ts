import { describe, expect, it } from 'vitest'
import { computeChartData, type PdfTrade } from './statement'

describe('PDF statement chart data', () => {
  it('buckets daily and weekday P&L like the dashboard calendar widgets', () => {
    const trades: PdfTrade[] = [
      {
        entryDate: '2026-05-10T23:30:00.000Z',
        closeDate: '2026-05-11T01:00:00.000Z',
        pnl: 100,
        commission: 10,
        accountNumber: 'A1',
        side: 'long',
        quantity: 1,
        instrument: 'ES',
        timeInPosition: 5400,
      },
    ]

    const chartData = computeChartData(trades, 'Europe/Paris')

    expect(chartData.dailyPnl).toEqual([{ label: '2026-05-10', value: 90 }])
    expect(chartData.weekdayPnl.find((point) => point.label === 'Sun')?.value).toBe(90)
    expect(chartData.weekdayPnl.find((point) => point.label === 'Mon')?.value).toBe(0)
  })

  it('classifies trade distribution using the configured breakeven range on net pnl', () => {
    const trades: PdfTrade[] = [
      {
        entryDate: '2026-05-10T12:00:00.000Z',
        closeDate: null,
        pnl: 50,
        commission: 10,
        accountNumber: 'A1',
        side: 'long',
        quantity: 1,
        instrument: 'ES',
        timeInPosition: 60,
      },
      {
        entryDate: '2026-05-11T12:00:00.000Z',
        closeDate: null,
        pnl: 15,
        commission: 10,
        accountNumber: 'A1',
        side: 'long',
        quantity: 1,
        instrument: 'ES',
        timeInPosition: 60,
      },
      {
        entryDate: '2026-05-12T12:00:00.000Z',
        closeDate: null,
        pnl: -20,
        commission: 0,
        accountNumber: 'A1',
        side: 'short',
        quantity: 1,
        instrument: 'ES',
        timeInPosition: 60,
      },
    ]

    const chartData = computeChartData(trades, 'UTC', { min: -5, max: 10 })

    expect(chartData.distribution).toEqual({ win: 1, breakeven: 1, loss: 1 })
  })
})
