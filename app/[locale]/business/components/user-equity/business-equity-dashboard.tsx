import { BusinessEquityGridClient } from './business-equity-grid-client'

interface BusinessEquityDashboardProps {
  businessId: string
}

export function BusinessEquityDashboard({ businessId }: BusinessEquityDashboardProps) {
  return (
    <div className="space-y-6">
      <BusinessEquityGridClient businessId={businessId} />
    </div>
  )
} 