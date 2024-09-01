'use server'
import { PrismaClient, Trade } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

const prisma = new PrismaClient()

export async function saveTrades(data: Trade[]) {
    const tradesIncluded = await prisma.trade.createManyAndReturn({data:data,skipDuplicates: true})
    await prisma.$disconnect()

    revalidatePath('/')
    redirect('/')
    return tradesIncluded
}