'use client'

import { useI18n } from "@/locales/client"
import { BusinessManagement } from "@/app/[locale]/business/components/business-management"

export default function BusinessManagePage() {
  const t = useI18n()

  return (
    <BusinessManagement
      title={t('business.title')}
      description={t('business.description')}
      showCreateButton={true}
      showJoinButton={false}
      createButtonText="Create a New Business"
      emptyStateMessage={t('dashboard.business.noBusiness')}
      subscriptionPrice="$500/month per business"
      subscriptionFeatures={[
        'Team collaboration',
        'Shared analytics', 
        'Manager access controls',
        'Business reporting'
      ]}
    />
  )
}
