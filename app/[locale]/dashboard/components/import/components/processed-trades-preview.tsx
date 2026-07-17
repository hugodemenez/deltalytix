'use client'

import { useMemo } from 'react'
import { Trade } from '@/prisma/generated/prisma/browser'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useI18n } from '@/locales/client'

type PreviewTrade = Partial<Trade> & {
  id?: string | null
  instrument?: string | null
  side?: string | null
  quantity?: number | null
  entryPrice?: string | number | null
  closePrice?: string | number | null
  entryDate?: string | null
  closeDate?: string | null
  pnl?: number | null
  timeInPosition?: number | null
  commission?: number | null
}

function formatTimeInPosition(seconds: number | null | undefined) {
  const value = seconds || 0
  return `${Math.floor(value / 60)}m ${Math.floor(value % 60)}s`
}

function formatDate(value: string | null | undefined) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

export function ProcessedTradesPreview({
  trades,
  title,
}: {
  trades: PreviewTrade[]
  title?: string
}) {
  const t = useI18n()

  const totalPnL = useMemo(
    () => trades.reduce((sum, trade) => sum + (trade.pnl || 0), 0),
    [trades]
  )
  const totalCommission = useMemo(
    () => trades.reduce((sum, trade) => sum + (trade.commission || 0), 0),
    [trades]
  )
  const uniqueInstruments = useMemo(
    () =>
      Array.from(
        new Set(
          trades
            .map((trade) => trade.instrument)
            .filter((instrument): instrument is string => Boolean(instrument))
        )
      ),
    [trades]
  )

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h3 className="text-xl font-normal tracking-tight md:text-2xl">
          {title || t('import.processed.title')}
        </h3>
        <div className="overflow-x-auto border-y border-black/10 dark:border-white/10">
          <Table>
            <TableHeader>
              <TableRow className="border-black/10 hover:bg-transparent dark:border-white/10">
                <TableHead className="text-xs font-medium text-black/45 dark:text-white/45">
                  {t('import.processed.columns.instrument')}
                </TableHead>
                <TableHead className="text-xs font-medium text-black/45 dark:text-white/45">
                  {t('import.processed.columns.side')}
                </TableHead>
                <TableHead className="text-xs font-medium text-black/45 dark:text-white/45">
                  {t('import.processed.columns.quantity')}
                </TableHead>
                <TableHead className="text-xs font-medium text-black/45 dark:text-white/45">
                  {t('import.processed.columns.entryPrice')}
                </TableHead>
                <TableHead className="text-xs font-medium text-black/45 dark:text-white/45">
                  {t('import.processed.columns.closePrice')}
                </TableHead>
                <TableHead className="text-xs font-medium text-black/45 dark:text-white/45">
                  {t('import.processed.columns.entryDate')}
                </TableHead>
                <TableHead className="text-xs font-medium text-black/45 dark:text-white/45">
                  {t('import.processed.columns.closeDate')}
                </TableHead>
                <TableHead className="text-xs font-medium text-black/45 dark:text-white/45">
                  {t('import.processed.columns.pnl')}
                </TableHead>
                <TableHead className="text-xs font-medium text-black/45 dark:text-white/45">
                  {t('import.processed.columns.timeInPosition')}
                </TableHead>
                <TableHead className="text-xs font-medium text-black/45 dark:text-white/45">
                  {t('import.processed.columns.commission')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trades.map((trade, index) => (
                <TableRow
                  key={trade.id || `processed-trade-${index}`}
                  className="border-black/10 dark:border-white/10"
                >
                  <TableCell className="font-medium">{trade.instrument}</TableCell>
                  <TableCell>{trade.side}</TableCell>
                  <TableCell>{trade.quantity}</TableCell>
                  <TableCell>{trade.entryPrice}</TableCell>
                  <TableCell>{trade.closePrice || '-'}</TableCell>
                  <TableCell className="text-black/55 dark:text-white/55">
                    {formatDate(trade.entryDate)}
                  </TableCell>
                  <TableCell className="text-black/55 dark:text-white/55">
                    {formatDate(trade.closeDate)}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {trade.pnl?.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-black/55 dark:text-white/55">
                    {formatTimeInPosition(trade.timeInPosition)}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {trade.commission?.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="grid gap-8 border-t border-black/10 pt-6 dark:border-white/10 sm:grid-cols-2">
        <div className="space-y-1">
          <p className="text-sm text-black/45 dark:text-white/45">
            {t('import.processed.totalPnl')}
          </p>
          <p className="text-2xl font-normal tracking-tight tabular-nums">
            {totalPnL.toFixed(2)}
          </p>
        </div>
        <div className="space-y-1 sm:text-right">
          <p className="text-sm text-black/45 dark:text-white/45">
            {t('import.processed.totalCommission')}
          </p>
          <p className="text-2xl font-normal tracking-tight tabular-nums">
            {totalCommission.toFixed(2)}
          </p>
        </div>
      </div>

      {uniqueInstruments.length > 0 && (
        <div className="space-y-3 border-t border-black/10 pt-6 dark:border-white/10">
          <p className="text-sm text-black/45 dark:text-white/45">
            {t('import.processed.instruments')}
          </p>
          <div className="flex flex-wrap gap-2">
            {uniqueInstruments.map((instrument) => (
              <span
                key={instrument}
                className="inline-flex h-8 items-center rounded-sm border border-black/10 px-3 text-sm dark:border-white/10"
              >
                {instrument}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
