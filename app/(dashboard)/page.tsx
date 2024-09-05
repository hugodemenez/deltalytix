'use server'
import { TradeDataProvider } from '@/components/context/trades-data'
import { useUser } from '@/components/context/user-data'
import Dashboard from '@/components/dashboard'
import Navbar from '@/components/navbar'
import { Button } from '@/components/ui/button'
import { createClient, signInWithDiscord } from '@/server/auth'
import { PrismaClient } from '@prisma/client'
import { redirect } from 'next/navigation'


export default async function Home() {

  return (
    <div>
        <Dashboard></Dashboard>
    </div>
  )
}