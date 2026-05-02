import { Suspense } from 'react'
import { AchievementsPageClient } from './achievements-client'

export const metadata = { title: 'Achievements | Deltalytix' }

export default function AchievementsPage() {
  return (
    <main className="container max-w-4xl py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Achievements</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Complete milestones to earn XP and unlock badges.
        </p>
      </div>
      <Suspense fallback={<div className="text-muted-foreground text-sm">Loading…</div>}>
        <AchievementsPageClient />
      </Suspense>
    </main>
  )
}
