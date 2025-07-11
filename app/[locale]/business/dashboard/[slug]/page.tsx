import { Suspense } from 'react'
import { BusinessEquityDashboard } from '../../components/user-equity/business-equity-dashboard'

interface BusinessDashboardPageProps {
  params: Promise<{
    slug: string
  }>
}

export default async function BusinessDashboardPage({ params }: BusinessDashboardPageProps) {
  const { slug } = await params
  
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BusinessEquityDashboard businessId={slug} />
    </Suspense>
  )
}
