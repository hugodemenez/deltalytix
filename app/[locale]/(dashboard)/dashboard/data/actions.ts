'use server'

import { PrismaClient, Trade, Account } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

type GroupedTrades = Record<string, Record<string, Trade[]>>

interface FetchTradesResult {
  groupedTrades: GroupedTrades;
  flattenedTrades: Trade[];
}

interface PropFirmAccountSetup {
  accountNumber: string
  userId: string
  propfirm: string
  profitTarget: number
  drawdownThreshold: number
  startingBalance: number
  isPerformance: boolean
}

interface SetupPropFirmAccountParams {
  accountNumber: string
  userId: string
  propfirm: string
  profitTarget: number
  drawdownThreshold: number
  startingBalance: number
  isPerformance: boolean
  trailingDrawdown: boolean
  trailingStopProfit?: number
  resetDate?: Date
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
    if (!acc[trade.accountNumber][trade.instrument]) {
      acc[trade.accountNumber][trade.instrument] = []
    }
    acc[trade.accountNumber][trade.instrument].push(trade)
    return acc
  }, {})

  return {
    groupedTrades,
    flattenedTrades: trades
  }
}

export async function deleteAccounts(accountNumbers: string[], userId: string): Promise<void> {
  await prisma.trade.deleteMany({
    where: {
      accountNumber: { in: accountNumbers },
      userId: userId
    }
  })
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

export async function deleteTradesByIds(tradeIds: string[]): Promise<void> {
  await prisma.trade.deleteMany({
    where: {
      id: { in: tradeIds }
    }
  })
}

export async function setupPropFirmAccount({
  accountNumber,
  userId,
  propfirm,
  profitTarget,
  drawdownThreshold,
  startingBalance,
  isPerformance,
  trailingDrawdown,
  trailingStopProfit,
  resetDate,
}: SetupPropFirmAccountParams) {
  const existingAccount = await prisma.account.findUnique({
    where: {
      number: accountNumber
    }
  })

  const accountData = {
    propfirm: propfirm,
    profitTarget: profitTarget,
    drawdownThreshold: drawdownThreshold,
    startingBalance: startingBalance,
    isPerformance: isPerformance,
    trailingDrawdown: trailingDrawdown,
    trailingStopProfit: trailingStopProfit,
    resetDate: resetDate,
  }

  if (existingAccount) {
    return await prisma.account.update({
      where: { number: accountNumber },
      data: accountData
    })
  }

  return await prisma.account.create({
    data: {
      number: accountNumber,
      userId: userId,
      ...accountData
    }
  })
}

export async function getPropFirmAccounts(userId: string) {
  try {
    // First get all accounts for the user
    const accounts = await prisma.account.findMany({
      where: {
        userId: userId,
      },
    })

    // Then get all payouts for these accounts
    const accountsWithPayouts = await Promise.all(
      accounts.map(async (account) => {
        const payouts = await prisma.payout.findMany({
          where: {
            accountNumber: account.number,
          },
          select: {
            id: true,
            amount: true,
            date: true,
            status: true, // Make sure we're selecting the status
          },
        })

        return {
          ...account,
          number: account.number,
          payouts: payouts,
        }
      })
    )

    return accountsWithPayouts
  } catch (error) {
    console.error('Error fetching accounts:', error)
    throw new Error('Failed to fetch accounts')
  }
}

export async function addPropFirmPayout(data: {
  accountNumber: string
  userId: string
  date: Date
  amount: number
  status: string // Add status parameter
}) {
  try {
    const payout = await prisma.payout.create({
      data: {
        accountNumber: data.accountNumber,
        date: data.date,
        amount: data.amount,
        status: data.status, // Include status in creation
      },
    })
    return payout
  } catch (error) {
    console.error('Error adding payout:', error)
    throw new Error('Failed to add payout')
  }
}

export async function deletePayout(payoutId: string) {
  try {
    const payout = await prisma.payout.findUnique({
      where: { id: payoutId },
      select: { accountNumber: true }
    });

    if (!payout) {
      throw new Error('Payout not found');
    }

    // Delete the payout
    await prisma.payout.delete({
      where: { id: payoutId }
    });

    // Decrement the payoutCount on the account
    await prisma.account.update({
      where: { number: payout.accountNumber },
      data: {
        payoutCount: {
          decrement: 1
        }
      }
    });

    return true;
  } catch (error) {
    console.error('Failed to delete payout:', error);
    throw new Error('Failed to delete payout');
  }
}

export async function updatePayout(
  payoutId: string,
  data: {
    date: Date
    amount: number
    status: string
  }
) {
  try {
    const updatedPayout = await prisma.payout.update({
      where: {
        id: payoutId,
      },
      data: {
        date: data.date,
        amount: data.amount,
        status: data.status, // Make sure we're updating the status
      },
    })
    return updatedPayout
  } catch (error) {
    console.error('Error updating payout:', error)
    throw new Error('Failed to update payout')
  }
}

export async function checkAndResetAccounts() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const accountsToReset = await prisma.account.findMany({
    where: {
      resetDate: {
        lte: today,
      },
    },
  })

  for (const account of accountsToReset) {
    await prisma.account.update({
      where: {
        id: account.id
      },
      data: {
        resetDate: null,
      }
    })
  }
}