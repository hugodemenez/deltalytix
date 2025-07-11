import { Suspense } from 'react'
import { BusinessEquityDashboard } from '../../components/user-equity/business-equity-dashboard'
import { BusinessManagement } from '../../components/business-management'

interface BusinessDashboardPageProps {
  params: Promise<{
    slug: string
  }>
}

export default async function BusinessDashboardPage({ params }: BusinessDashboardPageProps) {
  const { slug } = await params
  
  return (
    <div className="space-y-6">
      {/* Business Management Section */}
      <Suspense fallback={<div>Loading business management...</div>}>
        <BusinessManagement
          title="Business Management"
          description="Manage your business settings and team members"
          showCreateButton={true}
          showJoinButton={false}
          createButtonText="Create New Business"
          emptyStateMessage="No businesses found"
          subscriptionPrice="$500/month per business"
          subscriptionFeatures={[
            'Team collaboration',
            'Shared analytics', 
            'Manager access controls',
            'Business reporting'
          ]}
        />
      </Suspense>

      {/* Business Equity Dashboard */}
      <Suspense fallback={<div>Loading dashboard...</div>}>
        <BusinessEquityDashboard businessId={slug} />
      </Suspense>
    </div>
  )
}
