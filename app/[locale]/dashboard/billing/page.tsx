'use client'

import { Card, CardContent } from "@/components/ui/card"
import BillingManagement from './components/billing-management'

export default function BillingPage() {
  return (
    <div className="flex w-full relative min-h-screen">
      <div className='flex flex-1 w-full'>
        <div className={`w-full flex flex-col lg:flex-row min-h-screen`}>
          <main className="w-full py-6 lg:py-8">
            <div className="container mx-auto px-4">
              <Card className="border-none shadow-none bg-transparent">
                <CardContent className="p-0">
                      <BillingManagement />
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}