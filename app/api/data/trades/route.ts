import { NextResponse } from "next/server"
import { unstable_cache } from "next/cache"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/server/auth"
import { getSubscriptionDetails } from "@/server/subscription"
import { startOfDay } from "date-fns"

// Create cache function dynamically for each user/subscription combination
function getCachedTrades(userId: string, isSubscribed: boolean) {
  return unstable_cache(
    async () => {
      console.log(`[Cache MISS] Fetching trades for user ${userId}, subscribed: ${isSubscribed}`)
      
      const query: any = {
        where: { userId },
        orderBy: { entryDate: 'desc' }
      }

      if (!isSubscribed) {
        const oneWeekAgo = startOfDay(new Date())
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
        query.where.entryDate = { gte: oneWeekAgo.toISOString() }
      }

      return await prisma.trade.findMany(query)
    },
    // Static string array - this is the cache key
    [`trades-${userId}-${isSubscribed}`],
    { 
      tags: [`trades-${userId}`], // User-specific tag for revalidation
      revalidate: 300
    }
  )()  // Note the () at the end - we call the cached function immediately
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user?.id) {
      return NextResponse.json([], { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId || user.id !== userId) {
      return NextResponse.json([], { status: 403 })
    }

    const subscriptionDetails = await getSubscriptionDetails(user.email || '')
    const isSubscribed = subscriptionDetails?.isActive || false

    // Get cached trades
    const trades = await getCachedTrades(userId, isSubscribed)

    console.log(`[Cache] Returning ${trades.length} trades for user ${userId}`)
    return NextResponse.json(trades)
  } catch (error) {
    console.error("Error fetching trades:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}