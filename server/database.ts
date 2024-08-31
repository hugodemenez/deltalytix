'use server'
import { PrismaClient, Trade } from '@prisma/client'

const prisma = new PrismaClient()

export async function saveTrades(data: Trade[]){

    const trades = await prisma.trade.createMany({
        data: data.map((trade)=>{
            trade.quantity = Number(trade.quantity)
            trade.id = BigInt(trade.buyId)+BigInt(trade.sellId)
            return trade
        })
    })
    await prisma.$disconnect()
    return trades
}