'use server'
import { useUser } from '@/components/context/user-data'
import CsvImporter from '@/components/csv-importer'
import Dashboard from '@/components/dashboard'
import Navbar from '@/components/navbar'
import { Button } from '@/components/ui/button'
import { createClient, signInWithDiscord } from '@/server/auth'
import { PrismaClient } from '@prisma/client'
import { redirect } from 'next/navigation'


export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if(!user) {
    redirect('/authentication')
  }
  const prisma = new PrismaClient()
  const trades = await prisma.trade.findMany({where: {userId: user.id}})

  return (
    <div className="container mx-auto p-4 ">
      <Navbar/>
      <Dashboard trades={trades} user={user}></Dashboard>
    </div>
  )
}