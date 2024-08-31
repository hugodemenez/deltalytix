'use server'
import CsvImporter from '@/components/csv-importer'
import Dashboard from '@/components/dashboard'
import { Button } from '@/components/ui/button'
import { PrismaClient } from '@prisma/client'


export default async function Home() {
  const prisma = new PrismaClient()
  const trades = await prisma.trade.findMany()

  return (
    <div className="container mx-auto p-4">
      <Dashboard trades={trades}></Dashboard>
    </div>
  )
}