import { NextRequest, NextResponse } from 'next/server'
import { Trade, PrismaClient } from '@/prisma/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import { saveTradesAction } from '@/server/database';

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
        thorToken: token
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

interface ThorTrade {
  symbol: string
  pnl: number
  pnltick: number
  entry_time: string
  exit_time: string
  entry_price: number
  exit_price: number
  quantity: number
  side: 'Buy' | 'Sell'
  is_shared: boolean
}

interface ThorDate {
  date: string
  trades: ThorTrade[]
}

interface ThorRequest {
  account_id: string
  dates: ThorDate[]
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
    const data: ThorRequest = await req.json();
    
    // Transform the data to match the Trade schema
    const trades: Partial<Trade>[] = data.dates.flatMap(dateData => 
      dateData.trades.map(trade => {
        const entryTime = new Date(trade.entry_time)
        const exitTime = new Date(trade.exit_time)
        const timeInPosition = Math.round((exitTime.getTime() - entryTime.getTime()) / 1000) // in seconds

        return {
          id: `${dateData.date}-${trade.symbol}-${trade.entry_time}-${trade.quantity}`,
          userId: user.id,
          accountNumber: data.account_id,
          instrument: trade.symbol.slice(0, -2),
          entryDate: entryTime.toISOString(),
          closeDate: exitTime.toISOString(),
          entryPrice: trade.entry_price.toString(),
          closePrice: trade.exit_price.toString(),
          quantity: Math.abs(trade.quantity),
          side: trade.quantity > 0 ? 'Long' : 'Short',
          pnl: trade.pnl,
          timeInPosition,
          commission: 0,
          tags: [],
          comment: null,
          videoUrl: null,
          entryId: null,
          closeId: null,
          imageBase64: null,
          imageBase64Second: null,
          createdAt: new Date(),
        }
      })
    )

    const result = await saveTradesAction(trades as Trade[])

    // Handle duplicate trades as success, but return errors for other cases
    if (result.error && result.error !== 'DUPLICATE_TRADES') {
      return NextResponse.json(
        { error: result.error, details: result.details },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      tradesAdded: result.numberOfTradesAdded,
    })

  } catch (error) {
    console.error('[thor/store] Error processing request:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
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
    const accountNumber = searchParams.get('accountNumber');
    
    if (!accountNumber) {
      return NextResponse.json({ 
        error: 'Bad Request', 
        message: 'accountNumber parameter is required' 
      }, { status: 400 });
    }
    
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 100;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0;
    const fromDate = searchParams.get('from');
    const toDate = searchParams.get('to');
    
    // Build the query
    const query: any = {
      where: {
        userId: user.id,
        accountNumber: accountNumber
      },
      orderBy: {
        entryDate: 'desc' as const
      },
      take: limit,
      skip: offset
    };
    
    if (fromDate || toDate) {
      query.where.entryDate = {};
      
      if (fromDate) {
        query.where.entryDate.gte = new Date(fromDate);
      }
      
      if (toDate) {
        query.where.entryDate.lte = new Date(toDate);
      }
    }
    
    // Get trades
    const trades = await prisma.trade.findMany(query);
    
    // Get total count for pagination
    const totalCount = await prisma.trade.count({
      where: query.where
    });
    
    return NextResponse.json({ 
      success: true, 
      data: {
        trades,
        pagination: {
          total: totalCount,
          limit,
          offset
        }
      }
    }, { status: 200 });
    
  } catch (error) {
    console.error('[thor/store] Error retrieving trades:', error);
    return NextResponse.json({ 
      error: 'Failed to retrieve trades', 
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
    
    // Get accountNumber from query parameters
    const searchParams = req.nextUrl.searchParams;
    const accountNumber = searchParams.get('accountNumber');
    
    if (!accountNumber) {
      return NextResponse.json({ 
        error: 'Bad Request', 
        message: 'accountNumber parameter is required' 
      }, { status: 400 });
    }
    
    // Delete trades for this user and specific account
    const result = await prisma.trade.deleteMany({
      where: {
        userId: user.id,
        accountNumber: accountNumber
      }
    });
    
    return NextResponse.json({
      success: true,
      message: `${result.count} trades deleted successfully for account ${accountNumber}`
    }, { status: 200 });
    
  } catch (error) {
    console.error('[thor/store] Error deleting trades:', error);
    return NextResponse.json({ 
      error: 'Failed to delete trades', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
