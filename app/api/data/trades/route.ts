import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/server/auth"
import { getSubscriptionDetails } from "@/server/subscription"
import { startOfDay } from "date-fns"
import { revalidateTag } from "next/cache"
import { formatInTimeZone } from "date-fns-tz"

export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user?.id) {
      return NextResponse.json([], { status: 401 })
    }
    revalidateTag(user.id)

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json([], { status: 400 })
    }

    // Verify the requesting user has access to the requested user's data
    if (user.id !== userId) {
      return NextResponse.json([], { status: 403 })
    }

    // Get subscription details
    const subscriptionDetails = await getSubscriptionDetails(user.email || '')
    const isSubscribed = subscriptionDetails?.isActive || false

    // Build the query
    const query: any = {
      where: {
        userId: userId
      },
      orderBy: {
        entryDate: 'desc'
      }
    }

    // If not subscribed, limit to last week's trades
    if (!isSubscribed) {
      const oneWeekAgo = startOfDay(new Date())
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
      
      query.where.entryDate = {
        gte: oneWeekAgo.toISOString()
      }

      console.log('[trades/route] Limiting to last week for non-subscribed user:', { 
        userId,
        fromDate: oneWeekAgo.toISOString()
      })
    }

    const trades = await prisma.trade.findMany(query)

    return NextResponse.json(trades)
  } catch (error) {
    console.error("Error fetching trades:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
