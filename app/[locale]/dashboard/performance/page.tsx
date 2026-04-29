import { Suspense } from 'react'
import { PerformanceCenterClient } from './performance-client'

export const metadata = { title: 'Performance Center | Deltalytix' }

export default function PerformanceCenterPage() {
  return (
    <main className="container max-w-7xl py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Performance Center</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Deep analytics: win rate breakdown, MAE/MFE, drawdown curves, period comparison and export.
        </p>
      </div>
      <Suspense fallback={<div className="text-muted-foreground text-sm">Loading performance data…</div>}>
        <PerformanceCenterClient />
      </Suspense>
    </main>
  )
}
