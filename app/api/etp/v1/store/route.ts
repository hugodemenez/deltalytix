import { PrismaClient } from '@/prisma/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import { NextRequest, NextResponse } from 'next/server'

// Create a new PrismaClient instance for this API route
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
})

const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// Common authentication function to use across all methods
async function authenticateRequest(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { 
      authenticated: false, 
      error: {
        message: 'No valid authorization token found',
        status: 401
      }
    };
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    // Verify the token by finding the user
    const user = await prisma.user.findFirst({
      where: {
        etpToken: token
      }
    });
    
    if (!user) {
      return { 
        authenticated: false, 
        error: {
          message: 'No user found with the provided token',
          status: 401
        }
      };
    }
    
    return { authenticated: true, user };
  } catch (error) {
    return {
      authenticated: false,
      error: {
        message: 'Database error during authentication',
        status: 500
      }
    };
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    
    if (!auth.authenticated) {
      return NextResponse.json({ 
        error: 'Unauthorized', 
        message: auth.error?.message 
      }, { status: auth.error?.status || 401 });
    }
    
    const user = auth.user!;
    
    // Parse the request body
    const body = await req.json();
    const { orders } = body;
    
    if (!orders || !Array.isArray(orders) || orders.length === 0) {
      return NextResponse.json({ error: 'Invalid orders data' }, { status: 400 });
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
        });
      })
    );
    
    return NextResponse.json({ 
      success: true, 
      message: `${createdOrders.length} orders stored successfully` 
    }, { status: 200 });
    
  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to store orders', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    
    if (!auth.authenticated) {
      return NextResponse.json({ 
        error: 'Unauthorized', 
        message: auth.error?.message 
      }, { status: auth.error?.status || 401 });
    }
    
    const user = auth.user!;
    
    // Get query parameters
    const searchParams = req.nextUrl.searchParams;
    const accountId = searchParams.get('accountId');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 100;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0;
    const fromDate = searchParams.get('from');
    const toDate = searchParams.get('to');
    
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
    };
    
    // Add filters if provided
    if (accountId) {
      query.where.accountId = accountId;
    }
    
    if (fromDate || toDate) {
      query.where.time = {};
      
      if (fromDate) {
        query.where.time.gte = new Date(fromDate);
      }
      
      if (toDate) {
        query.where.time.lte = new Date(toDate);
      }
    }
    
    // Get orders
    const orders = await prisma.order.findMany(query);
    
    // Get total count for pagination
    const totalCount = await prisma.order.count({
      where: query.where
    });
    
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
    }, { status: 200 });
    
  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to retrieve orders', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    
    if (!auth.authenticated) {
      return NextResponse.json({ 
        error: 'Unauthorized', 
        message: auth.error?.message 
      }, { status: auth.error?.status || 401 });
    }
    
    const user = auth.user!;
    
    // Delete all orders for this user
    const result = await prisma.order.deleteMany({
      where: {
        userId: user.id
      }
    });
    
    return NextResponse.json({
      success: true,
      message: `${result.count} orders deleted successfully`
    }, { status: 200 });
    
  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to delete orders', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
} 