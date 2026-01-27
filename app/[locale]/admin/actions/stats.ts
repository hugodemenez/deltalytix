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