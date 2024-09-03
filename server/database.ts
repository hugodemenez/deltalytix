'use server'
import { PrismaClient, Trade } from '@prisma/client'
import { revalidatePath } from 'next/cache'


export async function saveTrades(data: Trade[]) {
    const prisma = new PrismaClient()
    await prisma.trade.createMany({data:data,skipDuplicates: true}).catch((e) => {
        console.error(e)
        return {error:e, trades:[]}
    }
    )
    await prisma.$disconnect()
    revalidatePath('/')
    return {error:null, trades:data}
}

export async function getTrades(userId: string) {
    const prisma = new PrismaClient()
    const trades = await prisma.trade.findMany({where: {userId: userId}})
    await prisma.$disconnect()
    return trades
}