'use server'
import { prisma } from '@/lib/prisma'
import { TickDetails } from "@/prisma/generated/prisma/client"

export async function getTickDetails(): Promise<TickDetails[]> {
  return prisma.tickDetails.findMany()
}