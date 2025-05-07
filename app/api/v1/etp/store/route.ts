import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/server/auth'

export async function POST(req: NextRequest) {
  try {
    // Extract the token from the Authorization header
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const token = authHeader.split(' ')[1]
    
    // Verify the token by finding the user
    const user = await prisma.user.findFirst({
      where: {
        etpToken: token
      }
    })
    
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    
    // Parse the request body
    const body = await req.json()
    const { orders } = body
    
    if (!orders || !Array.isArray(orders) || orders.length === 0) {
      return NextResponse.json({ error: 'Invalid orders data' }, { status: 400 })
    }
    
    // Process and store each order
    const createdOrders = await Promise.all(
      orders.map(async (order) => {
        return prisma.order.upsert({
          where: {
            orderId: order.OrderId
          },
          update: {
            accountId: order.AccountId,
            orderId: order.OrderId,
            orderAction: order.OrderAction,
            quantity: order.Quantity,
            averageFilledPrice: order.AverageFilledPrice,
            isOpeningOrder: order.IsOpeningOrder,
            time: new Date(order.Time),
            symbol: order.Instrument.Symbol,
            instrumentType: order.Instrument.Type
          },
          create: {
            accountId: order.AccountId,
            orderId: order.OrderId,
            orderAction: order.OrderAction,
            quantity: order.Quantity,
            averageFilledPrice: order.AverageFilledPrice,
            isOpeningOrder: order.IsOpeningOrder,
            time: new Date(order.Time),
            symbol: order.Instrument.Symbol,
            instrumentType: order.Instrument.Type,
            userId: user.id
          }
        })
      })
    )
    
    return NextResponse.json({ 
      success: true, 
      message: `${createdOrders.length} orders stored successfully` 
    })
    
  } catch (error) {
    console.error('Error storing orders:', error)
    return NextResponse.json({ 
      error: 'Failed to store orders', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    // Extract the token from the Authorization header
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const token = authHeader.split(' ')[1]
    
    // Verify the token by finding the user
    const user = await prisma.user.findFirst({
      where: {
        etpToken: token
      }
    })
    
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    
    // Get query parameters
    const url = new URL(req.url)
    const accountId = url.searchParams.get('accountId')
    const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!) : 100
    const offset = url.searchParams.get('offset') ? parseInt(url.searchParams.get('offset')!) : 0
    const fromDate = url.searchParams.get('from')
    const toDate = url.searchParams.get('to')
    
    // Build the query
    const query: any = {
      where: {
        userId: user.id
      },
      orderBy: {
        time: 'desc' as const
      },
      take: limit,
      skip: offset
    }
    
    // Add filters if provided
    if (accountId) {
      query.where.accountId = accountId
    }
    
    if (fromDate || toDate) {
      query.where.time = {}
      
      if (fromDate) {
        query.where.time.gte = new Date(fromDate)
      }
      
      if (toDate) {
        query.where.time.lte = new Date(toDate)
      }
    }
    
    // Get orders
    const orders = await prisma.order.findMany(query)
    
    // Get total count for pagination
    const totalCount = await prisma.order.count({
      where: query.where
    })
    
    return NextResponse.json({ 
      success: true, 
      data: {
        orders,
        pagination: {
          total: totalCount,
          limit,
          offset
        }
      }
    })
    
  } catch (error) {
    console.error('Error retrieving orders:', error)
    return NextResponse.json({ 
      error: 'Failed to retrieve orders', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    // Extract the token from the Authorization header
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const token = authHeader.split(' ')[1]
    
    // Verify the token by finding the user
    const user = await prisma.user.findFirst({
      where: {
        etpToken: token
      }
    })
    
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    
    // Delete all orders for this user
    const result = await prisma.order.deleteMany({
      where: {
        userId: user.id
      }
    })
    
    return NextResponse.json({
      success: true,
      message: `${result.count} orders deleted successfully`
    })
    
  } catch (error) {
    console.error('Error deleting orders:', error)
    return NextResponse.json({ 
      error: 'Failed to delete orders', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
} 