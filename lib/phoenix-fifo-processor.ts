/**
 * Phoenix FIFO Processor
 * 
 * Utility for computing trades from Phoenix orders using FIFO (First In, First Out) algorithm
 * with support for tick details integration
 */

import { ProcessedPhoenixOrder } from '@/types/phoenix-order'
import { TickDetails, Trade } from '@prisma/client'
import { filterOrdersForFIFO, sortOrdersByExecutionTime } from './phoenix-order-parser'
import { CITY_HEADER_NAME } from '@vercel/functions/headers'
import { createTradeWithDefaults } from './trade-factory'

/**
 * FIFO processing result
 */
export interface PhoenixFIFOResult {
  /** Successfully computed trades */
  trades: Trade[]
  
  /** Orders that couldn't be matched */
  unmatchedOrders: ProcessedPhoenixOrder[]
  
  /** Processing statistics */
  statistics: {
    totalOrders: number
    matchedOrders: number
    unmatchedOrders: number
    totalTrades: number
    totalPnl: number
    totalCommission: number
  }
  
  /** Processing errors */
  errors: string[]
}

/**
 * Configuration for FIFO processing
 */
export interface PhoenixFIFOConfig {
  /** Account number to filter orders */
  accountNumber?: string
  
  /** Minimum time between entry and exit (seconds) */
  minTimeInPosition?: number
  
  /** Maximum time between entry and exit (seconds) */
  maxTimeInPosition?: number
  
  /** Include tick details in results */
  includeTickDetails?: boolean
  
  /** Commission rate per contract (if not specified in orders) */
  defaultCommission?: number
}

/**
 * Process Phoenix orders using FIFO algorithm
 */
export function processPhoenixOrdersWithFIFO(
  orders: ProcessedPhoenixOrder[],
  tickDetails: Record<string, TickDetails> = {},
  config: PhoenixFIFOConfig = {}
): PhoenixFIFOResult {
  const errors: string[] = []
  const trades: Trade[] = []
  const unmatchedOrders: ProcessedPhoenixOrder[] = []
  
  try {
    // First, handle order modifications and cancellations
    const processedOrders = handleOrderModificationsAndCancellations(orders)
    
    // Filter and sort orders
    let filteredOrders = filterOrdersForFIFO(processedOrders)
    
    // Apply account filter if specified
    if (config.accountNumber) {
      filteredOrders = filteredOrders.filter(order => 
        order.accountNumber === config.accountNumber
      )
    }
    
    // Sort by execution time for FIFO
    const sortedOrders = sortOrdersByExecutionTime(filteredOrders)
    
    // Process orders using FIFO algorithm
    const result = matchOrdersWithFIFO(sortedOrders, tickDetails, config)
    
    trades.push(...result.trades)
    unmatchedOrders.push(...result.unmatchedOrders)
    errors.push(...result.errors)
    
  } catch (error) {
    errors.push(`FIFO processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
  
  // Calculate statistics
  const statistics = calculateStatistics(orders, trades, unmatchedOrders)
  
  return {
    trades,
    unmatchedOrders,
    statistics,
    errors
  }
}

/**
 * Handle order modifications and cancellations
 * Links orders with the same orderId to track modifications and cancellations
 */
function handleOrderModificationsAndCancellations(orders: ProcessedPhoenixOrder[]): ProcessedPhoenixOrder[] {
  // Group orders by orderId to handle modifications
  const ordersByOrderId = new Map<string, ProcessedPhoenixOrder[]>()
  
  for (const order of orders) {
    if (!ordersByOrderId.has(order.orderId)) {
      ordersByOrderId.set(order.orderId, [])
    }
    ordersByOrderId.get(order.orderId)!.push(order)
  }
  
  const processedOrders: ProcessedPhoenixOrder[] = []
  
  for (const [orderId, orderGroup] of ordersByOrderId) {
    if (orderGroup.length === 1) {
      // Single order, no modifications
      processedOrders.push(orderGroup[0])
    } else {
      // Multiple orders with same ID - handle modifications
      const finalOrder = resolveOrderModifications(orderGroup)
      if (finalOrder) {
        processedOrders.push(finalOrder)
      }
    }
  }
  
  return processedOrders
}

/**
 * Resolve order modifications by finding the final state
 */
function resolveOrderModifications(orders: ProcessedPhoenixOrder[]): ProcessedPhoenixOrder | null {
  // Sort by insert time to get chronological order
  const sortedOrders = [...orders].sort((a, b) => 
    new Date(a.insertTime).getTime() - new Date(b.insertTime).getTime()
  )
  
  // Find the latest non-canceled order
  let finalOrder: ProcessedPhoenixOrder | null = null
  
  for (const order of sortedOrders) {
    if (order.status === 'Canceled') {
      // If canceled, this is the final state
      finalOrder = order
      break
    } else if (order.status === 'Filled') {
      // If filled, this is the final state
      finalOrder = order
      break
    } else if (order.status === 'Modified' || order.status === 'Working') {
      // Keep track of the latest modification
      finalOrder = order
    }
  }
  
  return finalOrder
}

/**
 * Core FIFO matching algorithm
 */
function matchOrdersWithFIFO(
  orders: ProcessedPhoenixOrder[],
  tickDetails: Record<string, TickDetails>,
  config: PhoenixFIFOConfig
): { trades: Trade[], unmatchedOrders: ProcessedPhoenixOrder[], errors: string[] } {
  const trades: Trade[] = []
  const unmatchedOrders: ProcessedPhoenixOrder[] = []
  const errors: string[] = []
  
  // Group orders by symbol for FIFO processing
  const ordersBySymbol = new Map<string, ProcessedPhoenixOrder[]>()
  
  for (const order of orders) {
    if (!ordersBySymbol.has(order.baseSymbol)) {
      ordersBySymbol.set(order.baseSymbol, [])
    }
    ordersBySymbol.get(order.baseSymbol)!.push(order)
  }
  
  // Process each symbol separately
  for (const [symbol, symbolOrders] of ordersBySymbol) {
    try {
      const symbolResult = processSymbolOrders(symbol, symbolOrders, tickDetails, config)
      trades.push(...symbolResult.trades)
      unmatchedOrders.push(...symbolResult.unmatchedOrders)
      errors.push(...symbolResult.errors)
    } catch (error) {
      errors.push(`Failed to process symbol ${symbol}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      unmatchedOrders.push(...symbolOrders)
    }
  }
  
  return { trades, unmatchedOrders, errors }
}

/**
 * Process orders for a specific symbol
 */
function processSymbolOrders(
  symbol: string,
  orders: ProcessedPhoenixOrder[],
  tickDetails: Record<string, TickDetails>,
  config: PhoenixFIFOConfig
): { trades: Trade[], unmatchedOrders: ProcessedPhoenixOrder[], errors: string[] } {
  const trades: Trade[] = []
  const unmatchedOrders: ProcessedPhoenixOrder[] = []
  const errors: string[] = []
  
  // Maintain open positions for FIFO matching
  const openPositions: ProcessedPhoenixOrder[] = []
  
  for (const order of orders) {
    try {
      // Try to match with existing open positions
      let matched = false
      
      for (let i = 0; i < openPositions.length; i++) {
        const openPosition = openPositions[i]
        
        // Check if we can match (opposite sides)
        if (canMatchOrders(openPosition, order)) {
          const trade = createTrade(openPosition, order, symbol, tickDetails, config)
          
          if (trade) {
            trades.push(trade)
            
            // Update quantities (use absolute values for comparison)
            const openPositionAbsQty = Math.abs(openPosition.filledQty)
            const orderAbsQty = Math.abs(order.filledQty)
            
            // Reduce quantities by the trade quantity
            if (openPosition.side === 'BUY') {
              openPosition.filledQty -= trade.quantity
            } else {
              openPosition.filledQty += trade.quantity
            }
            
            if (order.side === 'BUY') {
              order.filledQty -= trade.quantity
            } else {
              order.filledQty += trade.quantity
            }
            
            // Remove fully matched open position
            if (Math.abs(openPosition.filledQty) <= 0) {
              openPositions.splice(i, 1)
            }
            
            // If current order is fully matched, don't add to open positions
            if (Math.abs(order.filledQty) <= 0) {
              matched = true
              break
            }
          }
        }
      }
      
      // If not fully matched, add remaining quantity to open positions
      if (!matched && Math.abs(order.filledQty) > 0) {
        openPositions.push({ ...order })
      }
      
    } catch (error) {
      errors.push(`Failed to process order ${order.orderNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      unmatchedOrders.push(order)
    }
  }
  
  // Add remaining open positions to unmatched orders
  unmatchedOrders.push(...openPositions)
  
  return { trades, unmatchedOrders, errors }
}

/**
 * Check if two orders can be matched
 */
function canMatchOrders(order1: ProcessedPhoenixOrder, order2: ProcessedPhoenixOrder): boolean {
  // Must be opposite sides
  if (order1.side === order2.side) {
    return false
  }
  
  // Both must have remaining quantity (use absolute values since SELL orders have negative filledQty)
  if (Math.abs(order1.filledQty) <= 0 || Math.abs(order2.filledQty) <= 0) {
    return false
  }
  
  // Both must be executed
  if (!order1.executeTime || !order2.executeTime || !order1.executePrice || !order2.executePrice) {
    return false
  }
  
  return true
}

/**
 * Create a trade from two matched orders
 */
function createTrade(
  entryOrder: ProcessedPhoenixOrder,
  exitOrder: ProcessedPhoenixOrder,
  symbol: string,
  tickDetails: Record<string, TickDetails>,
  config: PhoenixFIFOConfig
): Trade | null {
  try {
    // Determine trade direction
    const isLongTrade = entryOrder.side === 'BUY'
    const side: 'long' | 'short' = isLongTrade ? 'long' : 'short'
    
    // Calculate quantities to match (use absolute values for actual contract quantity)
    const matchQuantity = Math.min(Math.abs(entryOrder.filledQty), Math.abs(exitOrder.filledQty))
    
    // Determine entry and exit based on time
    const entryTime = new Date(entryOrder.executeTime!).getTime()
    const exitTime = new Date(exitOrder.executeTime!).getTime()
    
    let finalEntryOrder: ProcessedPhoenixOrder
    let finalExitOrder: ProcessedPhoenixOrder
    
    if (entryTime < exitTime) {
      finalEntryOrder = entryOrder
      finalExitOrder = exitOrder
    } else {
      finalEntryOrder = exitOrder
      finalExitOrder = entryOrder
    }
    
    // Calculate P&L
    const entryPrice = finalEntryOrder.executePrice!
    const exitPrice = finalExitOrder.executePrice!
    
    // Get tick details for P&L calculation
    const tickDetail = tickDetails[symbol]
    const tickValue = tickDetail?.tickValue || 1
    
    let grossPnl: number
    if (isLongTrade) {
      // Long: (Exit Price - Entry Price) × Quantity × Tick Value
      grossPnl = (exitPrice - entryPrice) * matchQuantity * tickValue
    } else {
      // Short: (Entry Price - Exit Price) × Quantity × Tick Value
      grossPnl = (entryPrice - exitPrice) * matchQuantity * tickValue
    }
    
    // Calculate commission
    const commission = (config.defaultCommission || 0) * matchQuantity
    
    // Calculate time in position
    const timeInPosition = Math.floor((exitTime - entryTime) / 1000)
    
    // Apply time filters if specified
    if (config.minTimeInPosition && timeInPosition < config.minTimeInPosition) {
      return null
    }
    
    if (config.maxTimeInPosition && timeInPosition > config.maxTimeInPosition) {
      return null
    }
    
    // Calculate tick details if requested
    let tickDetailsResult
    if (config.includeTickDetails && tickDetail) {
      const pnlPerContract = grossPnl / matchQuantity
      const ticks = Math.round(pnlPerContract / tickDetail.tickValue)
      const points = ticks * tickDetail.tickSize
      
      tickDetailsResult = {
        tickValue: tickDetail.tickValue,
        tickSize: tickDetail.tickSize,
        ticks,
        points
      }
    }
    
    return createTradeWithDefaults({
      id: `${finalEntryOrder.orderId}-${finalExitOrder.orderId}`,
      accountNumber: finalEntryOrder.accountNumber || 'Unknown',
      instrument: symbol,
      side: side,
      quantity: matchQuantity,
      entryPrice: entryPrice.toString(),
      closePrice: exitPrice.toString(),
      entryDate: finalEntryOrder.executeTime!,
      closeDate: finalExitOrder.executeTime!,
      pnl: grossPnl - commission,
      commission: commission,
      timeInPosition: timeInPosition,
      entryId: finalEntryOrder.orderId,
      closeId: finalExitOrder.orderId,
    })
    
  } catch (error) {
    console.error('Failed to create trade:', error)
    return null
  }
}

/**
 * Calculate processing statistics
 */
function calculateStatistics(
  originalOrders: ProcessedPhoenixOrder[],
  trades: Trade[],
  unmatchedOrders: ProcessedPhoenixOrder[]
) {
  const totalOrders = originalOrders.length
  const matchedOrders = totalOrders - unmatchedOrders.length
  const totalTrades = trades.length
  const totalPnl = trades.reduce((sum, trade) => sum + trade.pnl, 0)
  const totalCommission = trades.reduce((sum, trade) => sum + trade.commission, 0)
  
  return {
    totalOrders,
    matchedOrders,
    unmatchedOrders: unmatchedOrders.length,
    totalTrades,
    totalPnl,
    totalCommission
  }
}

/**
 * Export trades to chart-compatible format
 */
export function exportTradesForCharts(trades: Trade[]): Array<{
  pnl: number
  timeInPosition: number
  [key: string]: any
}> {
  return trades.map(trade => ({
    pnl: trade.pnl,
    timeInPosition: trade.timeInPosition,
    instrument: trade.instrument,
    side: trade.side,
    quantity: trade.quantity,
    entryPrice: trade.entryPrice,
    closePrice: trade.closePrice,
    entryDate: trade.entryDate,
    closeDate: trade.closeDate,
    commission: trade.commission
  }))
}
