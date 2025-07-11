import { redirect } from 'next/navigation'
import { getUserBusinesses, getUserBusinessAccess } from '../../dashboard/settings/actions'
import { NoBusinessFound } from '../components/no-business-found'
import { BusinessManagement } from '../components/business-management'

export default async function UserEquityPage() {
  // Get user's businesses
  const businessesResult = await getUserBusinesses()
  const managedResult = await getUserBusinessAccess()
  
  let firstBusinessId: string | null = null
  
  if (businessesResult.success) {
    // Check owned businesses first
    if (businessesResult.ownedBusinesses && businessesResult.ownedBusinesses.length > 0) {
      firstBusinessId = businessesResult.ownedBusinesses[0].id
    }
    // If no owned businesses, check joined businesses
    else if (businessesResult.joinedBusinesses && businessesResult.joinedBusinesses.length > 0) {
      firstBusinessId = businessesResult.joinedBusinesses[0].id
    }
  }
  
  // If still no business found, check managed businesses
  if (!firstBusinessId && managedResult.success && managedResult.managedBusinesses && managedResult.managedBusinesses.length > 0) {
    firstBusinessId = managedResult.managedBusinesses[0].id
  }
  
  // If we found a business, redirect to it
  if (firstBusinessId) {
    redirect(`/business/dashboard/${firstBusinessId}`)
  }
  
  // If no businesses found, show the default dashboard with a message
  return <BusinessManagement />
} 