'use server'

import { createClient } from '@supabase/supabase-js'
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