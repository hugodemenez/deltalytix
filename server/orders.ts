'use server'

import { createClient } from './auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

interface Instrument {
  Symbol: string
  Type: string
}

interface Order {
  AccountId: string
  OrderId: string
  OrderAction: string
  Quantity: number
  AverageFilledPrice: number
  IsOpeningOrder: boolean
  Time: string
  Instrument: Instrument
}

interface OrderFilters {
  accountId?: string
  fromDate?: Date | string
  toDate?: Date | string
  symbol?: string
  limit?: number
  offset?: number
}

export async function storeOrders(orders: Order[]) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('Unauthorized')
  }

  try {
    const userData = await prisma.user.findUnique({
      where: {
        auth_user_id: user.id
      },
      select: {
        id: true
      }
    })

    if (!userData) {
      throw new Error('User not found')
    }

    const createdOrders = await Promise.all(
      orders.map(async (order) => {
        return prisma.order.create({
          data: {
            accountId: order.AccountId,
            orderId: order.OrderId,
            orderAction: order.OrderAction,
            quantity: order.Quantity,
            averageFilledPrice: order.AverageFilledPrice,
            isOpeningOrder: order.IsOpeningOrder,
            time: new Date(order.Time),
            symbol: order.Instrument.Symbol,
            instrumentType: order.Instrument.Type,
            userId: userData.id
          }
        })
      })
    )

    revalidatePath('/dashboard')
    return { success: true, count: createdOrders.length }
  } catch (error) {
    console.error('Failed to store orders:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

export async function getOrders() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('Unauthorized')
  }

  try {
    const userData = await prisma.user.findUnique({
      where: {
        auth_user_id: user.id
      },
      select: {
        id: true
      }
    })

    if (!userData) {
      throw new Error('User not found')
    }

    const orders = await prisma.order.findMany({
      where: {
        userId: userData.id
      },
      orderBy: {
        time: 'desc'
      }
    })

    return { success: true, orders }
  } catch (error) {
    console.error('Failed to get orders:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

export async function getFilteredOrders(filters: OrderFilters = {}) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('Unauthorized')
  }

  try {
    const userData = await prisma.user.findUnique({
      where: {
        auth_user_id: user.id
      },
      select: {
        id: true
      }
    })

    if (!userData) {
      throw new Error('User not found')
    }

    const { 
      accountId, 
      fromDate, 
      toDate, 
      symbol, 
      limit = 100, 
      offset = 0 
    } = filters

    // Build the query
    const query: any = {
      where: {
        userId: userData.id
      },
      orderBy: {
        time: 'desc'
      },
      take: limit,
      skip: offset
    }

    // Add filters if provided
    if (accountId) {
      query.where.accountId = accountId
    }

    if (symbol) {
      query.where.symbol = symbol
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

    return { 
      success: true, 
      data: {
        orders,
        pagination: {
          total: totalCount,
          limit,
          offset
        }
      }
    }
  } catch (error) {
    console.error('Failed to get filtered orders:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

export async function deleteOrder(orderId: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('Unauthorized')
  }

  try {
    const userData = await prisma.user.findUnique({
      where: {
        auth_user_id: user.id
      },
      select: {
        id: true
      }
    })

    if (!userData) {
      throw new Error('User not found')
    }

    // Check if the order exists and belongs to the user
    const order = await prisma.order.findFirst({
      where: {
        orderId,
        userId: userData.id
      }
    })

    if (!order) {
      throw new Error('Order not found or not authorized to delete')
    }

    // Delete the order
    await prisma.order.delete({
      where: {
        orderId
      }
    })

    revalidatePath('/dashboard')
    return { success: true, message: 'Order deleted successfully' }
  } catch (error) {
    console.error('Failed to delete order:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

export async function deleteAllOrders() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('Unauthorized')
  }

  try {
    const userData = await prisma.user.findUnique({
      where: {
        auth_user_id: user.id
      },
      select: {
        id: true
      }
    })

    if (!userData) {
      throw new Error('User not found')
    }

    // Delete all orders for this user
    const result = await prisma.order.deleteMany({
      where: {
        userId: userData.id
      }
    })

    revalidatePath('/dashboard')
    return { success: true, message: `${result.count} orders deleted successfully` }
  } catch (error) {
    console.error('Failed to delete orders:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
} 