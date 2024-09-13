'use server'
import { TradeDataProvider } from '@/components/context/trades-data'
import { useUser } from '@/components/context/user-data'
import Dashboard from '@/components/dashboard'
import FilterLeftPane from '@/components/filters/filter-left-pane'
import Navbar from '@/components/navbar'
import { Button } from '@/components/ui/button'
import { createClient, signInWithDiscord } from '@/server/auth'
import { PrismaClient } from '@prisma/client'
import { redirect } from 'next/navigation'


export default async function Home() {

  return (
    <div>
      <FilterLeftPane />
      <main className="flex-1 overflow-x-hidden pl-0 md:pl-64">
        <div className="px-2 sm:px-6 lg:px-32 py-4">
          <Dashboard></Dashboard>
        </div>
      </main>

    </div>
  )
}