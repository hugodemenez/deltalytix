'use client'

import { Suspense, useState, useEffect } from 'react'
import { TeamEquityGridClient } from '../../components/user-equity/team-equity-grid-client'

interface TeamDashboardPageProps {
  params: Promise<{
    slug: string
  }>
}

export default function TeamDashboardPage({ params }: TeamDashboardPageProps) {
  const [slug, setSlug] = useState<string>('')

  // Handle async params
  useEffect(() => {
    params.then(({ slug }) => setSlug(slug))
  }, [params])
  
  if (!slug) {
    return <div>Loading...</div>
  }
  
  return (
    <div className="space-y-6">
      {/* Team Equity Dashboard */}
      <Suspense fallback={<div>Loading dashboard...</div>}>
        <TeamEquityGridClient teamId={slug} />
      </Suspense>
    </div>
  )
}
