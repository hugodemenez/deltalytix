'use server'

import { getUserId } from '@/server/auth'
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

export async function removeAccountsFromTrades(accountNumbers: string[]): Promise<void> {
  const userId = await getUserId()
  await prisma.trade.deleteMany({
    where: {
      accountNumber: { in: accountNumbers },
      userId: userId
    }
  })
}

export async function removeAccountFromTrades(accountNumber: string): Promise<void> {
  const userId = await getUserId()
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
  const trades = await prisma.trade.findMany({
    where: {
      accountNumber: accountNumber,
      instrument: { startsWith: instrumentGroup }
    }
  })
  // For each trade, update the commission
  for (const trade of trades) {
    const updatedCommission = newCommission * trade.quantity
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

export async function renameAccount(oldAccountNumber: string, newAccountNumber: string): Promise<void> {
  try {
    const userId = await getUserId()
    // First check if the account exists and get its ID
    const existingAccount = await prisma.account.findFirst({
      where: {
        number: oldAccountNumber,
        userId: userId
      }
    })

    if (!existingAccount) {
      throw new Error('Account not found')
    }

    // Check if the new account number is already in use by this user
    const duplicateAccount = await prisma.account.findFirst({
      where: {
        number: newAccountNumber,
        userId: userId
      }
    })

    if (duplicateAccount) {
      throw new Error('You already have an account with this number')
    }

    // Use a transaction to ensure all updates happen together
    await prisma.$transaction(async (tx) => {
      // Update the account number
      await tx.account.update({
        where: {
          id: existingAccount.id
        },
        data: {
          number: newAccountNumber
        }
      })

      // Update trades accountNumber
      await tx.trade.updateMany({
        where: {
          accountNumber: oldAccountNumber,
          userId: userId
        },
        data: {
          accountNumber: newAccountNumber
        }
      })

      // Update payouts accountNumber
      await tx.payout.updateMany({
        where: {
          accountId: existingAccount.id
        },
        data: {
          accountNumber: newAccountNumber
        }
      })
    })
  } catch (error) {
    console.error('Error renaming account:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Failed to rename account')
  }
}

export async function deleteTradesByIds(tradeIds: string[]): Promise<void> {
  await prisma.trade.deleteMany({
    where: {
      id: { in: tradeIds }
    }
  })
}

export async function setupAccount({
  number,
  propfirm,
  profitTarget,
  drawdownThreshold,
  startingBalance,
  isPerformance,
  trailingDrawdown,
  trailingStopProfit,
  resetDate,
  consistencyPercentage = 30,
  accountSize,
  accountSizeName,
  price,
  priceWithPromo,
  evaluation,
  minDays,
  dailyLoss,
  rulesDailyLoss,
  trailing,
  tradingNewsAllowed,
  activationFees,
  isRecursively,
  payoutBonus,
  profitSharing,
  payoutPolicy,
  balanceRequired,
  minTradingDaysForPayout,
  minPayout,
  maxPayout,
  maxFundedAccounts,
}: Account) {
  const userId = await getUserId()
  const existingAccount = await prisma.account.findFirst({
    where: {
      number: number,
      userId: userId
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
    consistencyPercentage: consistencyPercentage,
    accountSize,
    accountSizeName,
    price,
    priceWithPromo,
    evaluation,
    minDays,
    dailyLoss,
    rulesDailyLoss,
    trailing,
    tradingNewsAllowed,
    activationFees,
    isRecursively,
    payoutBonus,
    profitSharing,
    payoutPolicy,
    balanceRequired,
    minTradingDaysForPayout,
    minPayout,
    maxPayout,
    maxFundedAccounts,
  }
  console.log('accountData', accountData)

  if (existingAccount) {
    return await prisma.account.update({
      where: { id: existingAccount.id },
      data: accountData
    })
  }

  return await prisma.account.create({
    data: {
      number: number,
      userId: userId,
      ...accountData
    }
  })
}

export async function deleteAccount(accountNumber: string) {
  const userId = await getUserId()
  await prisma.account.delete({
    where: {
      number_userId: {
        number: accountNumber,
        userId: userId
      }
    }
  })
}
export async function getAccounts() {
  try {
    // First get all accounts for the user
    const userId = await getUserId()
    const accounts = await prisma.account.findMany({
      where: {
        userId: userId,
      },
      include: {
        payouts: {
          select: {
            id: true,
            amount: true,
            date: true,
            status: true,
          }
        }
      }
    })

    return accounts.map(account => ({
      ...account,
      number: account.number,
      payouts: account.payouts,
    }))
  } catch (error) {
    console.error('Error fetching accounts:', error)
    throw new Error('Failed to fetch accounts')
  }
}

export async function addPayout(data: {
  accountNumber: string
  date: Date
  amount: number
  status: string
}) {
  try {
    // First find the account to get its ID
    const userId = await getUserId()
    const account = await prisma.account.findFirst({
      where: {
        number: data.accountNumber,
        userId: userId
      }
    })

    if (!account) {
      throw new Error('Account not found')
    }

    const payout = await prisma.payout.create({
      data: {
        accountNumber: data.accountNumber,
        date: data.date,
        amount: data.amount,
        status: data.status,
        account: {
          connect: {
            id: account.id
          }
        }
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
    const userId = await getUserId()
    const payout = await prisma.payout.findUnique({
      where: { id: payoutId, account: { userId: userId } },
      include: {
        account: true
      }
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
      where: { 
        id: payout.account.id
      },
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

export async function updatePayout(data: {
  id: string
  date: Date
  amount: number
  status: string
}) {
  try {
    const updatedPayout = await prisma.payout.update({
      where: {
        id: data.id,
      },
      data: {
        date: data.date,
        amount: data.amount,
        status: data.status,
      },
    })
    return updatedPayout
  } catch (error) {
    console.error('Error updating payout:', error)
    throw new Error('Failed to update payout')
  }
}

export async function renameInstrument(accountNumber: string, oldInstrumentName: string, newInstrumentName: string): Promise<void> {
  try {
    const userId = await getUserId()
    // Update all trades for this instrument in this account
    await prisma.trade.updateMany({
      where: {
        accountNumber: accountNumber,
        instrument: oldInstrumentName,
        userId: userId
      },
      data: {
        instrument: newInstrumentName
      }
    })
  } catch (error) {
    console.error('Error renaming instrument:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Failed to rename instrument')
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

export async function createGroup(name: string) {
  try {
    const userId = await getUserId()
    const group = await prisma.group.create({
      data: {
        name,
        userId,
      },
    })
    return group
  } catch (error) {
    console.error('Error creating group:', error)
    throw error
  }
}

export async function updateGroup(groupId: string, name: string) {
  try {
    const group = await prisma.group.update({
      where: { id: groupId },
      data: { name },
    })
    return group
  } catch (error) {
    console.error('Error updating group:', error)
    throw error
  }
}

export async function deleteGroup(groupId: string) {
  try {
    await prisma.group.delete({
      where: { id: groupId },
    })
  } catch (error) {
    console.error('Error deleting group:', error)
    throw error
  }
}

export async function moveAccountToGroup(accountId: string, groupId: string | null) {
  try {
    const account = await prisma.account.update({
      where: { id: accountId },
      data: { groupId },
    })
    return account
  } catch (error) {
    console.error('Error moving account to group:', error)
    throw error
  }
}

export async function getGroups() {
  try {
    const userId = await getUserId()
    const groups = await prisma.group.findMany({
      where: { userId },
      include: {
        accounts: true,
      },
    })
    return groups
  } catch (error) {
    console.error('Error fetching groups:', error)
    throw error
  }
}

export async function createAccount(accountNumber: string) {
  try {
    const userId = await getUserId()
    const account = await prisma.account.create({
      data: {
        number: accountNumber,
        userId,
        propfirm: '',
        drawdownThreshold: 0,
        profitTarget: 0,
        isPerformance: false,
        payoutCount: 0,
      },
    })
    return account
  } catch (error) {
    console.error('Error creating account:', error)
    throw error
  }
}