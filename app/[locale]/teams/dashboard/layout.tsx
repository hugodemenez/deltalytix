import { Suspense } from 'react'
import { AuthProfileButton } from '../components/auth-profile-button'
import { TeamManagement } from '../components/team-management'
import { AuthProfileButtonSkeleton } from '../components/auth-profile-button-skeleton'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {

    // If no teams found, show the default dashboard with a message
    return (
        <div className="px-2 sm:px-6 lg:px-32">
            <div className="flex justify-end py-4">
            <Suspense fallback={<AuthProfileButtonSkeleton />}>
                <AuthProfileButton />
            </Suspense>
            </div>
            <TeamManagement />
            {children}
        </div>
    )
} 