'use server'

import { prisma } from '@/lib/prisma';
import { Trade } from '@prisma/client'


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
  resetDate?: Date | null 
  consistencyPercentage?: number
  accountSize?: string
  accountSizeName?: string
  price?: number
  priceWithPromo?: number
  evaluation?: boolean
  minDays?: number
  dailyLoss?: number
  rulesDailyLoss?: string
  trailing?: string
  tradingNewsAllowed?: boolean
  activationFees?: number
  isRecursively?: string
  payoutBonus?: number
  profitSharing?: number
  payoutPolicy?: string
  balanceRequired?: number
  minTradingDaysForPayout?: number
  minPayout?: number
  maxPayout?: string
  maxFundedAccounts?: number
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
  try {
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
}: SetupPropFirmAccountParams) {
  const existingAccount = await prisma.account.findFirst({
    where: {
      number: accountNumber,
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
      number: accountNumber,
      userId: userId,
      ...accountData
    }
  })
}

export async function deletePropFirmAccount(accountNumber: string, userId: string) {
  await prisma.account.delete({
    where: {
      number_userId: {
        number: accountNumber,
        userId: userId
      }
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

export async function addPropFirmPayout(data: {
  accountNumber: string
  userId: string
  date: Date
  amount: number
  status: string
}) {
  try {
    // First find the account to get its ID
    const account = await prisma.account.findFirst({
      where: {
        number: data.accountNumber,
        userId: data.userId
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
    const payout = await prisma.payout.findUnique({
      where: { id: payoutId },
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

export async function renameInstrument(accountNumber: string, oldInstrumentName: string, newInstrumentName: string, userId: string): Promise<void> {
  try {
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

export async function createGroup(userId: string, name: string) {
  try {
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

export async function getGroups(userId: string) {
  try {
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

export async function createAccount(userId: string, accountNumber: string) {
  try {
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