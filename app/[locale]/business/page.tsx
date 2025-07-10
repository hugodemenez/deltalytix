import { Suspense } from 'react'
import { AdminDashboard } from '@/app/[locale]/admin/components/dashboard/admin-dashboard'

export default function AdminPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AdminDashboard />
    </Suspense>
  )
}