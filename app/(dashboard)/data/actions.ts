'use server'

import { PrismaClient, Trade } from '@prisma/client'

const prisma = new PrismaClient()

type GroupedTrades = Record<string, Record<string, Trade[]>>

interface FetchTradesResult {
  groupedTrades: GroupedTrades;
  flattenedTrades: Trade[];
}

export async function fetchGroupedTrades(userId: string): Promise<FetchTradesResult> {
  const trades = await prisma.trade.findMany({
    where: {
      userId: userId
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
    const instrumentKey = trade.instrument.slice(0, 2)
    if (!acc[trade.accountNumber][instrumentKey]) {
      acc[trade.accountNumber][instrumentKey] = []
    }
    acc[trade.accountNumber][instrumentKey].push(trade)
    return acc
  }, {})

  return {
    groupedTrades,
    flattenedTrades: trades
  }
}

export async function deleteAccount(accountNumber: string, userId: string): Promise<void> {
  await prisma.trade.deleteMany({
    where: {
      accountNumber: accountNumber,
      userId: userId
    }
  })
}

export async function deleteInstrumentGroup(accountNumber: string, instrumentGroup: string, userId: string): Promise<void> {
  await prisma.trade.deleteMany({
    where: {
      accountNumber: accountNumber,
      instrument: { startsWith: instrumentGroup },
      userId: userId
    }
  })
}

export async function updateCommissionForGroup(accountNumber: string, instrumentGroup: string, newCommission: number): Promise<void> {
  // We have to update the commission for all trades in the group and compute based on the quantity
  console.log('accountNumber', accountNumber)
  console.log('instrumentGroup', instrumentGroup)
  console.log('newCommission', newCommission)
  const trades = await prisma.trade.findMany({
    where: {
      accountNumber: accountNumber,
      instrument: { startsWith: instrumentGroup }
    }
  })
  // For each trade, update the commission
  for (const trade of trades) {
    const updatedCommission = newCommission * trade.quantity
    console.log('updatedCommission', updatedCommission)
    await prisma.trade.update({
      where: {
        id: trade.id
      },
      data: {
        commission: updatedCommission
      }
    })
  }
}

export async function renameAccount(oldAccountNumber: string, newAccountNumber: string, userId: string): Promise<void> {
  await prisma.trade.updateMany({
    where: {
      accountNumber: oldAccountNumber,
      userId: userId
    },
    data: {
      accountNumber: newAccountNumber
    }
  })
}