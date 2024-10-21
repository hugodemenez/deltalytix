'use server'
import { PrismaClient, TickDetails } from "@prisma/client"

export async function getTickDetails(): Promise<TickDetails[]> {
  const prisma = new PrismaClient()
  const tickDetails = await prisma.tickDetails.findMany()
  await prisma.$disconnect()
  return tickDetails
}