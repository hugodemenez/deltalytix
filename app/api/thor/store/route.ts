import { NextRequest, NextResponse } from 'next/server'
import { saveTrades } from '@/server/database'
import { Trade, PrismaClient } from '@prisma/client'

// Create a new PrismaClient instance for this API route
const prisma = new PrismaClient()

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
    const trades: Trade[] = data.dates.flatMap(dateData => 
      dateData.trades.map(trade => {
        const entryTime = new Date(trade.entry_time)
        const exitTime = new Date(trade.exit_time)
        const timeInPosition = Math.round((exitTime.getTime() - entryTime.getTime()) / 1000) // in seconds

        return {
          id: `${dateData.date}-${trade.symbol}-${trade.entry_time}-${trade.quantity}`,
          userId: user.id,
          accountNumber: data.account_id,
          instrument: trade.symbol,
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

    const result = await saveTrades(trades)

    if (result.error) {
      return NextResponse.json(
        { error: result.error, details: result.details },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      tradesAdded: result.numberOfTradesAdded
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
