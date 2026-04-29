'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Download, FileText, Table } from 'lucide-react'
import { resolveDateRange } from '@/lib/performance/date-utils'
import type { PerformanceData, PeriodRange } from '@/lib/performance/types'

interface Props {
  data: PerformanceData
  period: PeriodRange
}

function toCSV(rows: string[][]): string {
  return rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
}

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function ExportButton({ data, period }: Props) {
  const [exporting, setExporting] = useState(false)
  const { label } = resolveDateRange(period)
  const safe = label.replace(/[^\w\d-]/g, '_')

  function exportWinRateCSV() {
    setExporting(true)
    const rows: string[][] = [['Instrument', 'Trades', 'Wins', 'Losses', 'Win Rate', 'Avg PnL', 'Total PnL']]
    for (const row of data.winRate.byInstrument) {
      rows.push([
        row.label,
        String(row.trades),
        String(row.wins),
        String(row.losses),
        (row.winRate * 100).toFixed(2) + '%',
        row.avgPnl.toFixed(2),
        row.totalPnl.toFixed(2),
      ])
    }
    downloadBlob(toCSV(rows), `deltalytix_winrate_${safe}.csv`, 'text/csv')
    setExporting(false)
  }

  function exportSummaryCSV() {
    setExporting(true)
    const s = data.summary
    const rows: string[][] = [
      ['Metric', 'Value'],
      ['Period', label],
      ['Total Trades', String(s.trades)],
      ['Win Rate', (s.winRate * 100).toFixed(2) + '%'],
      ['Total P&L', s.totalPnl.toFixed(2)],
      ['Avg P&L', s.avgPnl.toFixed(2)],
      ['Profit Factor', s.profitFactor.toFixed(2)],
      ['Avg R:R', s.avgRR.toFixed(2)],
      ['Max Drawdown', s.maxDrawdown.toFixed(2)],
      ['Best Trade', s.bestTrade.toFixed(2)],
      ['Worst Trade', s.worstTrade.toFixed(2)],
    ]
    downloadBlob(toCSV(rows), `deltalytix_summary_${safe}.csv`, 'text/csv')
    setExporting(false)
  }

  function exportMaeMfeCSV() {
    setExporting(true)
    const rows: string[][] = [['Trade ID', 'Instrument', 'Entry Date', 'P&L', 'MAE', 'MFE', 'Efficiency', 'R:R']]
    for (const p of data.maeMfe.points) {
      rows.push([
        p.tradeId,
        p.instrument,
        p.entryDate,
        p.pnl.toFixed(2),
        p.mae.toFixed(2),
        p.mfe.toFixed(2),
        (p.efficiency * 100).toFixed(2) + '%',
        p.riskRewardRatio.toFixed(2),
      ])
    }
    downloadBlob(toCSV(rows), `deltalytix_maemfe_${safe}.csv`, 'text/csv')
    setExporting(false)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={exporting}>
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportSummaryCSV}>
          <Table className="mr-2 h-4 w-4" />
          Summary CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportWinRateCSV}>
          <Table className="mr-2 h-4 w-4" />
          Win Rate by Instrument CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportMaeMfeCSV} disabled={data.maeMfe.points.length === 0}>
          <FileText className="mr-2 h-4 w-4" />
          MAE/MFE CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
