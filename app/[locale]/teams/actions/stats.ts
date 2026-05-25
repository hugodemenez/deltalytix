'use server'

import { createClient, User } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})
import { prisma } from '@/lib/prisma'

export async function getUserStats() {
  let allUsers: any[] = []
  let page = 1
  const perPage = 1000
  let hasMore = true

  while (hasMore) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage
    })

    if (error) {
      console.error('Error fetching users:', error)
      break
    }

    if (data.users.length === 0) {
      hasMore = false
    } else {
      allUsers = [...allUsers, ...data.users]
      page++
    }
  }
  
  // Group users by day of creation
  const dailyUsers = allUsers.reduce((acc, user) => {
    const day = user.created_at.slice(0, 10) // YYYY-MM-DD format
    acc[day] = (acc[day] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Convert to array format for charts and sort by date
  const dailyData = Object.entries(dailyUsers)
    .map(([date, count]) => ({
      date,
      users: count
    }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return {
    totalUsers: allUsers.length,
    dailyData,
    allUsers: allUsers.map(user => ({
      id: user.id,
      email: user.email,
      created_at: user.created_at
    }))
  }
}

export async function getTradeStats() {
  const trades = await prisma.trade.findMany({
    select: {
      createdAt: true
    },
    orderBy: {
      createdAt: 'asc'
    }
  })

  // Group trades by day
  const dailyTrades = trades.reduce((acc, trade) => {
    const day = trade.createdAt.toISOString().slice(0, 10) // YYYY-MM-DD format
    acc[day] = (acc[day] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Convert to array format for Tremor
  const dailyData = Object.entries(dailyTrades).map(([date, count]) => ({
    date,
    trades: count
  }))

  return {
    totalTrades: trades.length,
    dailyData
  }
} 

export async function getFreeUsers(){
  console.log('Starting getFreeUsers function')

  // Get all trades with their user IDs
  console.log('Fetching trades...')
  const trades = await prisma.trade.findMany({
  })
  console.log(`Found ${trades.length} total trades`)

  // Get all users who have subscriptions
  console.log('Fetching subscriptions...')
  const subscribedUsers = await prisma.subscription.findMany({
    select: { userId: true }
  })
  console.log(`Found ${subscribedUsers.length} subscribed users`)
  const subscribedUserIds = new Set(subscribedUsers.map(sub => sub.userId))

  // Get unique user IDs who have trades but no subscription
  const freeUserIds = [...new Set(trades.map(trade => trade.userId))]
    .filter(userId => !subscribedUserIds.has(userId))
  console.log(`Found ${freeUserIds.length} free users with trades`)

  // Get user emails from Supabase auth
  let allUsers: User[] = []
  let page = 1
  const perPage = 1000
  let hasMore = true

  console.log('Starting Supabase user fetch...')
  while (hasMore) {
    console.log(`Fetching page ${page} of users...`)
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage
    })

    if (error) {
      console.error('Error fetching users:', error)
      break
    }

    if (data.users.length === 0) {
      console.log('No more users to fetch')
      hasMore = false
    } else {
      console.log(`Retrieved ${data.users.length} users on page ${page}`)
      allUsers = [...allUsers, ...data.users]
      page++
    }
  }
  console.log(`Total users fetched from Supabase: ${allUsers.length}`)

  // Map free users to their emails and trades
  const mappedUsers = freeUserIds.map(userId => {
    const user = allUsers.find(u => u.id === userId)
    const userTrades = trades.filter(trade => trade.userId === userId)
    console.log(`Mapping user ${userId}: Found email: ${!!user?.email}, Trades: ${userTrades.length}`)
    return {
      email: user?.email || '',
      trades: userTrades
    }
  }).filter(user => user.email !== '')

  console.log(`Returning ${mappedUsers.length} mapped free users`)
  return mappedUsers
}

export async function getUserEquityData(page: number = 1, limit: number = 10) {
  console.log('Starting getUserEquityData function')

  // First, get all unique user IDs that have trades, with pagination
  console.log('Fetching users with trades from database...')
  const usersWithTrades = await prisma.trade.groupBy({
    by: ['userId'],
    _count: {
      id: true
    },
    orderBy: {
      userId: 'asc'
    },
    skip: (page - 1) * limit,
    take: limit
  })

  console.log(`Found ${usersWithTrades.length} users with trades for page ${page}`)

  if (usersWithTrades.length === 0) {
    return {
      users: [],
      totalUsers: 0,
      hasMore: false
    }
  }

  // Get the user IDs for this page
  const userIds = usersWithTrades.map(user => user.userId)

  // Get user data from Supabase for these specific users
  console.log('Fetching user data from Supabase...')
  const userPromises = userIds.map(userId => 
    supabase.auth.admin.getUserById(userId)
  )
  
  const userResults = await Promise.all(userPromises)
  const users = userResults
    .map(result => result.data?.user)
    .filter(user => user !== null) as User[]

  console.log(`Retrieved ${users.length} users from Supabase`)

  // Get all trades for these users
  console.log('Fetching trades for users...')
  const trades = await prisma.trade.findMany({
    where: {
      userId: {
        in: userIds
      }
    },
    select: {
      id: true,
      userId: true,
      pnl: true,
      createdAt: true,
      entryDate: true,
      closeDate: true,
      instrument: true,
      side: true,
      entryPrice: true,
      closePrice: true,
      quantity: true,
      commission: true
    },
    orderBy: {
      createdAt: 'asc'
    }
  })

  console.log(`Found ${trades.length} trades for users`)

  // Group trades by user ID
  const userTradesMap = trades.reduce((acc, trade) => {
    if (!acc[trade.userId]) {
      acc[trade.userId] = []
    }
    acc[trade.userId].push(trade)
    return acc
  }, {} as Record<string, typeof trades>)

  // Calculate equity curve for each user
  const userEquityData = users.map((user) => {
    const userTrades = userTradesMap[user.id] || []
    
    // Sort trades by creation date
    const sortedTrades = userTrades.sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )

    // Calculate cumulative PnL and equity curve
    let cumulativePnL = 0
    const equityCurve = sortedTrades.map((trade, index) => {
      const netPnl = trade.pnl - (trade.commission || 0)
      cumulativePnL += netPnl
      return {
        date: trade.createdAt.toISOString().slice(0, 10),
        pnl: netPnl,
        cumulativePnL,
        tradeNumber: index + 1
      }
    })

    // Calculate statistics with commissions included
    const totalPnL = userTrades.reduce((sum, trade) => sum + (trade.pnl - (trade.commission || 0)), 0)
    const winningTrades = userTrades.filter(trade => (trade.pnl - (trade.commission || 0)) > 0)
    const losingTrades = userTrades.filter(trade => (trade.pnl - (trade.commission || 0)) < 0)
    const winRate = userTrades.length > 0 ? (winningTrades.length / userTrades.length) * 100 : 0
    const averageWin = winningTrades.length > 0 ? winningTrades.reduce((sum, trade) => sum + (trade.pnl - (trade.commission || 0)), 0) / winningTrades.length : 0
    const averageLoss = losingTrades.length > 0 ? losingTrades.reduce((sum, trade) => sum + (trade.pnl - (trade.commission || 0)), 0) / losingTrades.length : 0
    const maxDrawdown = calculateMaxDrawdown(equityCurve)
    const profitFactor = Math.abs(averageLoss) > 0 ? Math.abs(averageWin) / Math.abs(averageLoss) : 0

    return {
      userId: user.id,
      email: user.email || 'Unknown',
      createdAt: user.created_at || '',
      trades: userTrades,
      equityCurve,
      statistics: {
        totalTrades: userTrades.length,
        totalPnL,
        winRate,
        averageWin,
        averageLoss,
        maxDrawdown,
        profitFactor,
        winningTrades: winningTrades.length,
        losingTrades: losingTrades.length
      }
    }
  }).filter(user => user.email !== 'Unknown' && user.email !== '')

  // Get total count of users with trades for pagination
  const totalUsersWithTrades = await prisma.trade.groupBy({
    by: ['userId'],
    _count: {
      id: true
    }
  })

  console.log(`Returning ${userEquityData.length} users with equity data for page ${page}`)
  return {
    users: userEquityData,
    totalUsers: totalUsersWithTrades.length,
    hasMore: (page * limit) < totalUsersWithTrades.length
  }
}

export async function getIndividualUserEquityData(userId: string) {
  console.log(`Starting getIndividualUserEquityData for user ${userId}`)

  // Get user from Supabase auth
  const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId)
  
  if (userError || !userData.user) {
    console.error('Error fetching user:', userError)
    return null
  }

  // Get trades for this specific user
  const trades = await prisma.trade.findMany({
    where: {
      userId: userId
    },
    select: {
      id: true,
      userId: true,
      pnl: true,
      createdAt: true,
      entryDate: true,
      closeDate: true,
      instrument: true,
      side: true,
      entryPrice: true,
      closePrice: true,
      quantity: true,
      commission: true
    },
    orderBy: {
      createdAt: 'asc'
    }
  })

  // Sort trades by creation date
  const sortedTrades = trades.sort((a, b) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )

  // Calculate cumulative PnL and equity curve
  let cumulativePnL = 0
  const equityCurve = sortedTrades.map((trade, index) => {
    const netPnl = trade.pnl - (trade.commission || 0)
    cumulativePnL += netPnl
    return {
      date: trade.createdAt.toISOString().slice(0, 10),
      pnl: netPnl,
      cumulativePnL,
      tradeNumber: index + 1
    }
  })

  // Calculate statistics with commissions included
  const totalPnL = trades.reduce((sum, trade) => sum + (trade.pnl - (trade.commission || 0)), 0)
  const winningTrades = trades.filter(trade => (trade.pnl - (trade.commission || 0)) > 0)
  const losingTrades = trades.filter(trade => (trade.pnl - (trade.commission || 0)) < 0)
  const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0
  const averageWin = winningTrades.length > 0 ? winningTrades.reduce((sum, trade) => sum + (trade.pnl - (trade.commission || 0)), 0) / winningTrades.length : 0
  const averageLoss = losingTrades.length > 0 ? losingTrades.reduce((sum, trade) => sum + (trade.pnl - (trade.commission || 0)), 0) / losingTrades.length : 0
  const maxDrawdown = calculateMaxDrawdown(equityCurve)
  const profitFactor = Math.abs(averageLoss) > 0 ? Math.abs(averageWin) / Math.abs(averageLoss) : 0

  return {
    userId,
    email: userData.user.email || 'Unknown',
    createdAt: userData.user.created_at || '',
    trades,
    equityCurve,
    statistics: {
      totalTrades: trades.length,
      totalPnL,
      winRate,
      averageWin,
      averageLoss,
      maxDrawdown,
      profitFactor,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length
    }
  }
}

export async function getTeamEquityData(teamId: string, page: number = 1, limit: number = 100) {
  console.log(`Starting getTeamEquityData for team ${teamId}`)

  // First, get the team to find trader IDs
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { traderIds: true }
  })

  if (!team) {
    console.error(`Team ${teamId} not found`)
    return {
      users: [],
      totalUsers: 0,
      hasMore: false
    }
  }

  console.log(`Found team with ${team.traderIds.length} traders`)

  if (team.traderIds.length === 0) {
    return {
      users: [],
      totalUsers: 0,
      hasMore: false
    }
  }

  // Apply pagination to trader IDs
  const startIndex = (page - 1) * limit
  const endIndex = startIndex + limit
  const paginatedTraderIds = team.traderIds.slice(startIndex, endIndex)

  console.log(`Processing ${paginatedTraderIds.length} traders for page ${page}`)

  // Get user data from Supabase for these specific traders
  console.log('Fetching user data from Supabase...')
  const userPromises = paginatedTraderIds.map(userId => 
    supabase.auth.admin.getUserById(userId)
  )
  
  const userResults = await Promise.all(userPromises)
  const users = userResults
    .map(result => result.data?.user)
    .filter(user => user !== null) as User[]

  console.log(`Retrieved ${users.length} users from Supabase`)

  // Get all trades for these users
  console.log('Fetching trades for users...')
  const trades = await prisma.trade.findMany({
    where: {
      userId: {
        in: paginatedTraderIds
      }
    },
    select: {
      id: true,
      userId: true,
      pnl: true,
      createdAt: true,
      entryDate: true,
      closeDate: true,
      instrument: true,
      side: true,
      entryPrice: true,
      closePrice: true,
      quantity: true,
      commission: true
    },
    orderBy: {
      createdAt: 'asc'
    }
  })

  console.log(`Found ${trades.length} trades for users`)

  // Group trades by user ID
  const userTradesMap = trades.reduce((acc, trade) => {
    if (!acc[trade.userId]) {
      acc[trade.userId] = []
    }
    acc[trade.userId].push(trade)
    return acc
  }, {} as Record<string, typeof trades>)

  // Calculate equity curve for each user
  const userEquityData = users.map((user) => {
    const userTrades = userTradesMap[user.id] || []
    
    // Sort trades by entry date
    const sortedTrades = userTrades.sort((a, b) => 
      new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime()
    )

    // Calculate cumulative PnL and equity curve
    let cumulativePnL = 0
    const equityCurve = sortedTrades.map((trade, index) => {
      const netPnl = trade.pnl - (trade.commission || 0)
      cumulativePnL += netPnl
      return {
        date: trade.entryDate.slice(0, 10),
        pnl: netPnl,
        cumulativePnL,
        tradeNumber: index + 1
      }
    })

    // Calculate statistics with commissions included
    const totalPnL = userTrades.reduce((sum, trade) => sum + (trade.pnl - (trade.commission || 0)), 0)
    const winningTrades = userTrades.filter(trade => (trade.pnl - (trade.commission || 0)) > 0)
    const losingTrades = userTrades.filter(trade => (trade.pnl - (trade.commission || 0)) < 0)
    const winRate = userTrades.length > 0 ? (winningTrades.length / userTrades.length) * 100 : 0
    const averageWin = winningTrades.length > 0 ? winningTrades.reduce((sum, trade) => sum + (trade.pnl - (trade.commission || 0)), 0) / winningTrades.length : 0
    const averageLoss = losingTrades.length > 0 ? losingTrades.reduce((sum, trade) => sum + (trade.pnl - (trade.commission || 0)), 0) / losingTrades.length : 0
    const maxDrawdown = calculateMaxDrawdown(equityCurve)
    const profitFactor = Math.abs(averageLoss) > 0 ? Math.abs(averageWin) / Math.abs(averageLoss) : 0

    return {
      userId: user.id,
      email: user.email || 'Unknown',
      createdAt: user.created_at || '',
      trades: userTrades,
      equityCurve,
      statistics: {
        totalTrades: userTrades.length,
        totalPnL,
        winRate,
        averageWin,
        averageLoss,
        maxDrawdown,
        profitFactor,
        winningTrades: winningTrades.length,
        losingTrades: losingTrades.length
      }
    }
  }).filter(user => user.email !== 'Unknown' && user.email !== '')

  console.log(`Returning ${userEquityData.length} users with equity data for team ${teamId}, page ${page}`)
  return {
    users: userEquityData,
    totalUsers: team.traderIds.length,
    hasMore: (page * limit) < team.traderIds.length
  }
}

function calculateMaxDrawdown(equityCurve: { cumulativePnL: number }[]): number {
  let maxDrawdown = 0
  let peak = 0

  for (const point of equityCurve) {
    if (point.cumulativePnL > peak) {
      peak = point.cumulativePnL
    }
    const drawdown = peak - point.cumulativePnL
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown
    }
  }

  return maxDrawdown
}

export async function exportTeamTradesAction(teamId: string): Promise<string> {
  console.log(`Starting exportTeamTradesAction for team ${teamId}`)

  // Get the team to find trader IDs
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { traderIds: true }
  })

  if (!team) {
    throw new Error(`Team ${teamId} not found`)
  }

  console.log(`Found team with ${team.traderIds.length} traders`)

  if (team.traderIds.length === 0) {
    throw new Error('No traders found in this team')
  }

  // Get user data from Supabase for all traders
  console.log('Fetching user data from Supabase...')
  const userPromises = team.traderIds.map(userId => 
    supabase.auth.admin.getUserById(userId)
  )
  
  const userResults = await Promise.all(userPromises)
  const users = userResults
    .map(result => result.data?.user)
    .filter(user => user !== null) as User[]

  // Create a map of userId to email
  const userEmailMap = users.reduce((acc, user) => {
    acc[user.id] = user.email || 'Unknown'
    return acc
  }, {} as Record<string, string>)

  console.log(`Retrieved ${users.length} users from Supabase`)

  // Get all trades for these users
  console.log('Fetching trades for all users...')
  const trades = await prisma.trade.findMany({
    where: {
      userId: {
        in: team.traderIds
      }
    },
    select: {
      id: true,
      userId: true,
      pnl: true,
      createdAt: true,
      entryDate: true,
      closeDate: true,
      instrument: true,
      side: true,
      entryPrice: true,
      closePrice: true,
      quantity: true,
      commission: true,
      groupId: true,
      tags: true,
      comment: true
    },
    orderBy: [
      { userId: 'asc' },
      { entryDate: 'asc' }
    ]
  })

  console.log(`Found ${trades.length} trades for export`)

  // Generate CSV content
  const csvHeaders = [
    'Trader Email',
    'Trade ID',
    'Entry Date',
    'Close Date',
    'Instrument',
    'Side',
    'Quantity',
    'Entry Price',
    'Close Price',
    'PnL',
    'Commission',
    'Net PnL',
    'Tags',
    'Comment',
    'Created At'
  ]

  const csvRows = trades.map(trade => {
    const netPnl = trade.pnl - (trade.commission || 0)
    return [
      userEmailMap[trade.userId] || 'Unknown',
      trade.id,
      trade.entryDate,
      trade.closeDate,
      trade.instrument,
      trade.side || '',
      trade.quantity?.toString() || '',
      trade.entryPrice?.toString() || '',
      trade.closePrice?.toString() || '',
      trade.pnl.toString(),
      (trade.commission || 0).toString(),
      netPnl.toString(),
      trade.tags.join('; '),
      trade.comment || '',
      trade.createdAt.toISOString()
    ].map(field => {
      // Convert to string and escape fields that contain commas, quotes, or newlines
      const fieldStr = String(field)
      if (fieldStr.includes(',') || fieldStr.includes('"') || fieldStr.includes('\n')) {
        return `"${fieldStr.replace(/"/g, '""')}"`
      }
      return fieldStr
    }).join(',')
  })

  const csv = [csvHeaders.join(','), ...csvRows].join('\n')
  
  console.log(`Generated CSV with ${csvRows.length} rows`)
  return csv
}
