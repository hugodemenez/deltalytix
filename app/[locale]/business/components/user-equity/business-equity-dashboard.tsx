import { BusinessEquityGridClient } from './business-equity-grid-client'

interface BusinessEquityDashboardProps {
  businessId: string
}

export async function BusinessEquityDashboard({ businessId }: BusinessEquityDashboardProps) {
  return (
    <div className="p-6 space-y-6">
      <BusinessEquityGridClient businessId={businessId} />
    </div>
  )
} 