'use server'

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface Trade {
  id: string
  accountNumber: string
  instrument: string
  commission: number
}

type GroupedTrades = Record<string, Record<string, Trade[]>>

export async function fetchGroupedTrades(): Promise<GroupedTrades> {
  const trades = await prisma.trade.findMany({
    select: {
      id: true,
      accountNumber: true,
      instrument: true,
      commission: true
    },
    orderBy: [
      { accountNumber: 'asc' },
      { instrument: 'asc' }
    ]
  })

  const groupedTrades = trades.reduce<GroupedTrades>((acc, trade) => {
    if (!acc[trade.accountNumber]) {
      acc[trade.accountNumber] = {}
    }
    if (!acc[trade.accountNumber][trade.instrument]) {
      acc[trade.accountNumber][trade.instrument] = []
    }
    acc[trade.accountNumber][trade.instrument].push(trade)
    return acc
  }, {})

  return groupedTrades
}

export async function deleteInstrument(accountNumber: string, instrument: string): Promise<void> {
  await prisma.trade.deleteMany({
    where: {
      accountNumber: accountNumber,
      instrument: instrument
    }
  })
}

export async function updateCommission(accountNumber: string, instrument: string, newCommission: number): Promise<void> {
  await prisma.trade.updateMany({
    where: {
      accountNumber: accountNumber,
      instrument: instrument
    },
    data: {
      commission: newCommission
    }
  })
}