'use server'
import { prisma } from '@/lib/prisma'
import { TickDetails } from "@prisma/client"

export async function getTickDetails(): Promise<TickDetails[]> {
  const tickDetails = await prisma.tickDetails.findMany()
  await prisma.$disconnect()
  return tickDetails
}