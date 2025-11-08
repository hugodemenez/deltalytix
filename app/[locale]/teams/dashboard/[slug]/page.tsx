'use client'

import { Suspense, useState, useEffect } from 'react'
import { BusinessEquityGridClient } from '../../components/user-equity/business-equity-grid-client'

interface BusinessDashboardPageProps {
  params: Promise<{
    slug: string
  }>
}

export default function BusinessDashboardPage({ params }: BusinessDashboardPageProps) {
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
      {/* Business Equity Dashboard */}
      <Suspense fallback={<div>Loading dashboard...</div>}>
        <BusinessEquityGridClient businessId={slug} />
      </Suspense>
    </div>
  )
}
