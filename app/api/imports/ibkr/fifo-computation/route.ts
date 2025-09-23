import { openai } from "@ai-sdk/openai"
import { streamObject } from "ai"
import { tradeSchema, orderSchema } from './schema'
import { type FinancialInstrument } from '../extract-orders/schema'
import { z } from 'zod/v3';

export const maxDuration = 60 // Allow up to 60 seconds for AI processing

type Order = z.infer<typeof orderSchema>
type Trade = z.infer<typeof tradeSchema>

function matchOrdersWithFIFO(orders: Order[], instruments: FinancialInstrument[]): Trade[] {
  // Sort orders by timestamp to ensure FIFO
  const sortedOrders = [...orders].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  
  const trades: Trade[] = [];
  const openPositions: Map<string, Order[]> = new Map(); // symbol -> orders
  
  for (const order of sortedOrders) {
    const symbol = order.rawSymbol;
    
    if (!openPositions.has(symbol)) {
      openPositions.set(symbol, []);
    }
    
    const symbolOrders = openPositions.get(symbol)!;
    
    // Try to match with existing opposite position
    let matched = false;
    
    for (let i = 0; i < symbolOrders.length; i++) {
      const existingOrder = symbolOrders[i];
      
      // Check if we can match (opposite sides)
      if ((existingOrder.side === 'BUY' && order.side === 'SELL') || 
          (existingOrder.side === 'SELL' && order.side === 'BUY')) {
        
        // Find the instrument to get multiplier
        const instrument = instruments.find(inst => inst.symbol === symbol);
        const multiplier = instrument?.multiplier || 1;
        
        // Calculate quantities to match
        const matchQuantity = Math.min(existingOrder.quantity, order.quantity);
        
        // Determine trade direction and correct entry/exit assignment
        const isLongTrade = existingOrder.side === 'BUY';
        
        let entryOrder: Order;
        let exitOrder: Order;
        
        if (isLongTrade) {
          // Long trade: BUY first (entry), then SELL (exit)
          entryOrder = existingOrder; // BUY order
          exitOrder = order; // SELL order
        } else {
          // Short trade: SELL first (entry), then BUY (exit)
          entryOrder = existingOrder; // SELL order 
          exitOrder = order; // BUY order
        }
        
        // Calculate P&L
        let grossPnl: number;
        if (isLongTrade) {
          // Long: (Exit Price - Entry Price) × Quantity × Multiplier
          grossPnl = (exitOrder.price - entryOrder.price) * matchQuantity * multiplier;
        } else {
          // Short: (Entry Price - Exit Price) × Quantity × Multiplier
          grossPnl = (entryOrder.price - exitOrder.price) * matchQuantity * multiplier;
        }
        
        // Calculate time in position (in seconds)
        const entryTime = new Date(entryOrder.timestamp).getTime();
        const exitTime = new Date(exitOrder.timestamp).getTime();
        const timeInPosition = Math.floor((exitTime - entryTime) / 1000);
        
        // Calculate total commission
        const totalCommission = (entryOrder.commission || 0) + (exitOrder.commission || 0);
        // Create trade
        const trade: Trade = {
          instrument: symbol.slice(0, -2),
          side: isLongTrade ? 'long' : 'short',
          quantity: matchQuantity,
          entryPrice: entryOrder.price.toString(),
          closePrice: exitOrder.price.toString(),
          entryDate: entryOrder.timestamp,
          closeDate: exitOrder.timestamp,
          pnl: grossPnl,
          commission: totalCommission,
          timeInPosition: timeInPosition,
          entryId: entryOrder.orderId,
          closeId: exitOrder.orderId,
          orderIds: [entryOrder.orderId!, exitOrder.orderId!].filter(Boolean),
          accountNumber: entryOrder.accountNumber || exitOrder.accountNumber || 'Unknown'
        };
        
        trades.push(trade);
        
        // Update remaining quantities
        existingOrder.quantity -= matchQuantity;
        order.quantity -= matchQuantity;
        
        // Remove fully matched orders
        if (existingOrder.quantity === 0) {
          symbolOrders.splice(i, 1);
        }
        
        matched = true;
        break;
      }
    }
    
    // If not fully matched, add remaining quantity to open positions
    if (order.quantity > 0) {
      symbolOrders.push({
        ...order,
        quantity: order.quantity
      });
    }
  }
  
  return trades;
}

export async function POST(request: Request) {
    try {
        const json = await request.json()
        const { orders, instruments } = json

        if (!orders || !Array.isArray(orders)) {
            return new Response(JSON.stringify({ error: 'No orders provided or invalid format' }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        if (!instruments || !Array.isArray(instruments)) {
            return new Response(JSON.stringify({ error: 'No instruments provided or invalid format' }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        // Validate orders
        const validOrders = orders.filter((order: any) => {
            try {
                orderSchema.parse(order);
                return true;
            } catch (error) {
                console.warn('Order validation failed:', error, 'Order:', order);
                return false;
            }
        });

        console.log(`Processing ${validOrders.length} valid orders with ${instruments.length} instruments`);

        // Match orders using custom FIFO algorithm
        const trades = matchOrdersWithFIFO(validOrders, instruments);

        console.log(`Generated ${trades.length} trades`);

        // Validate trades
        const validTrades = trades.filter((trade: Trade) => {
            try {
                tradeSchema.parse(trade);
                return true;
            } catch (error) {
                console.warn('Trade validation failed:', error, 'Trade:', trade);
                return false;
            }
        });

        return new Response(JSON.stringify(validTrades), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error('Error processing request:', error);
        return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to process request' }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
} 