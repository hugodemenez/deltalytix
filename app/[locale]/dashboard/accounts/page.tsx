'use client'

import { AccountsOverview } from '../components/accounts/accounts-overview'

export default function AccountsPage() {
  return (
    <div className="flex-1 w-full">
      <AccountsOverview size="large" />
    </div>
  )
}