'use client'

import { Suspense, useState, useEffect } from 'react'
import { BusinessEquityDashboard } from '../../components/user-equity/business-equity-dashboard'
import { BusinessManagement } from '../../components/business-management'

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
      {/* Business Management Section */}
      <Suspense fallback={<div>Loading business management...</div>}>
        <BusinessManagement
        />
      </Suspense>

      {/* Business Equity Dashboard */}
      <Suspense fallback={<div>Loading dashboard...</div>}>
        <BusinessEquityDashboard businessId={slug} />
      </Suspense>
    </div>
  )
}
