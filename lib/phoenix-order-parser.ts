/**
 * Phoenix Order Parser
 * 
 * Utility functions for parsing and processing Phoenix orders
 * from the proprietary format to a standardized format for FIFO processing
 */

import { PhoenixOrder, ProcessedPhoenixOrder, PhoenixOrderProcessingResult } from '@/types/phoenix-order'

/**
 * Parse raw Phoenix order data into structured format
 */
export function parsePhoenixOrders(rawOrders: any[]): PhoenixOrderProcessingResult {
  const processedOrders: ProcessedPhoenixOrder[] = []
  const failedOrders: PhoenixOrder[] = []
  const errors: string[] = []
  
  let filledOrders = 0
  let rejectedOrders = 0
  let cancelledOrders = 0
  
  for (let i = 0; i < rawOrders.length; i++) {
    try {
      const rawOrder = rawOrders[i]
      const parsedOrder = parseSinglePhoenixOrder(rawOrder, i)
      
      if (parsedOrder) {
        const processedOrder = enhancePhoenixOrder(parsedOrder)
        processedOrders.push(processedOrder)
        
        // Update statistics
        if (processedOrder.status.toLowerCase() === 'filled') {
          filledOrders++
        } else if (processedOrder.status.toLowerCase() === 'rejected') {
          rejectedOrders++
        } else if (processedOrder.status.toLowerCase() === 'cancelled') {
          cancelledOrders++
        }
      } else {
        failedOrders.push(rawOrder as PhoenixOrder)
        errors.push(`Failed to parse order at index ${i}`)
      }
    } catch (error) {
      failedOrders.push(rawOrders[i] as PhoenixOrder)
      errors.push(`Error parsing order at index ${i}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  
  return {
    processedOrders,
    failedOrders,
    errors,
    summary: {
      totalOrders: rawOrders.length,
      processedCount: processedOrders.length,
      failedCount: failedOrders.length,
      filledOrders,
      rejectedOrders,
      cancelledOrders
    }
  }
}

/**
 * Parse a single raw Phoenix order
 */
function parseSinglePhoenixOrder(rawOrder: any, index: number): PhoenixOrder | null {
  try {
    // Handle different possible input formats
    const order = normalizeRawOrder(rawOrder)
    
    // Validate required fields
    if (!order.symbol || !order.insertTime) {
      return null
    }
    
    return {
      orderNumber: parseNumber(order.orderNumber, index + 1),
      orderId: String(order.orderId || order.orderNumber || `order_${index + 1}`).trim(),
      symbol: String(order.symbol).trim(),
      insertTime: parseTimestamp(order.insertTime),
      executeTime: order.executeTime ? parseTimestamp(order.executeTime) : null,
      cancelTime: order.cancelTime ? parseTimestamp(order.cancelTime) : null,
      orderType: String(order.orderType || 'Unknown').trim(),
      status: parseStatus(order.status, order.executeTime, order.cancelTime),
      reason: order.reason ? String(order.reason).trim() : null,
      insertPrice: parseNumber(order.insertPrice, 0),
      executePrice: order.executePrice ? parseNumber(order.executePrice, null) : null,
      totalQty: parseNumber(order.totalQty, 0),
      filledQty: parseNumber(order.filledQty, 0),
      source: String(order.source || 'Unknown').trim(),
      platform: order.platform ? String(order.platform).trim() : null,
      ip: order.ip ? String(order.ip).trim() : null,
      accountNumber: order.accountNumber ? String(order.accountNumber).trim() : null
    }
  } catch (error) {
    console.warn(`Failed to parse order at index ${index}:`, error)
    return null
  }
}

/**
 * Normalize raw order data to handle different input formats
 */
function normalizeRawOrder(rawOrder: any): any {
  // Handle case where rawOrder might be an array (table row format)
  if (Array.isArray(rawOrder)) {
    return {
      orderNumber: rawOrder[0],
      orderId: rawOrder[0], // Use order number as ID if not provided separately
      symbol: rawOrder[1],
      insertTime: rawOrder[2],
      executeTime: rawOrder[3],
      cancelTime: rawOrder[4],
      orderType: rawOrder[5],
      status: rawOrder[6],
      reason: rawOrder[7],
      insertPrice: rawOrder[8],
      executePrice: rawOrder[9],
      totalQty: rawOrder[10],
      filledQty: rawOrder[11],
      source: rawOrder[12],
      platform: rawOrder[13],
      ip: rawOrder[14],
      accountNumber: rawOrder[15] || null
    }
  }
  
  // Handle object format
  return rawOrder
}

/**
 * Parse timestamp from various formats
 */
function parseTimestamp(timestamp: any): string {
  if (!timestamp) return new Date().toISOString()
  
  const str = String(timestamp).trim()
  
  // Handle "10/13/2025, 01:55 PM" format
  if (str.includes('/') && str.includes(',')) {
    try {
      const date = new Date(str)
      if (!isNaN(date.getTime())) {
        return date.toISOString()
      }
    } catch (error) {
      // Fall through to other parsing methods
    }
  }
  
  // Handle ISO string
  if (str.includes('T') || str.includes('Z')) {
    try {
      const date = new Date(str)
      if (!isNaN(date.getTime())) {
        return date.toISOString()
      }
    } catch (error) {
      // Fall through
    }
  }
  
  // Handle dash or null values
  if (str === '-' || str === 'null' || str === '') {
    return new Date().toISOString() // Default to current time
  }
  
  // Try direct parsing
  try {
    const date = new Date(str)
    if (!isNaN(date.getTime())) {
      return date.toISOString()
    }
  } catch (error) {
    // Fall through
  }
  
  // Default fallback
  return new Date().toISOString()
}

/**
 * Parse number from various formats
 */
function parseNumber(value: any, defaultValue: number | null = 0): number {
  if (value === null || value === undefined) return defaultValue ?? 0
  
  const str = String(value).trim()
  
  // Handle dash or null values
  if (str === '-' || str === 'null' || str === '' || str === 'N/A') {
    return defaultValue ?? 0
  }
  
  const parsed = parseFloat(str)
  return isNaN(parsed) ? (defaultValue ?? 0) : parsed
}

/**
 * Parse status based on Phoenix rules:
 * - If executeTime != null, then order is "Filled"
 * - If cancelTime != null, then order is "Canceled"
 * - Otherwise use the provided status
 */
function parseStatus(status: any, executeTime: any, cancelTime: any): 'Filled' | 'Working' | 'Modified' | 'Canceled' {
  // Check if order is canceled
  if (cancelTime && cancelTime !== '-' && cancelTime !== 'null' && cancelTime !== '') {
    return 'Canceled'
  }
  
  // Check if order is filled
  if (executeTime && executeTime !== '-' && executeTime !== 'null' && executeTime !== '') {
    return 'Filled'
  }
  
  // Use provided status if valid
  const statusStr = String(status || '').trim().toLowerCase()
  switch (statusStr) {
    case 'filled':
      return 'Filled'
    case 'working':
      return 'Working'
    case 'modified':
      return 'Modified'
    case 'canceled':
    case 'cancelled':
      return 'Canceled'
    default:
      return 'Working' // Default to working if status is unclear
  }
}

/**
 * Enhance Phoenix order with computed fields for FIFO processing
 */
function enhancePhoenixOrder(order: PhoenixOrder): ProcessedPhoenixOrder {
  const side = determineOrderSide(order)
  const absQuantity = Math.abs(order.totalQty)
  const absFilledQty = Math.abs(order.filledQty)
  const remainingQty = Math.max(0, absQuantity - absFilledQty)
  const isFullyFilled = absFilledQty >= absQuantity
  const isCanceled = order.status === 'Canceled'
  const isWorking = order.status === 'Working'
  const isMatchable = isFullyFilled && order.status === 'Filled' && !isCanceled
  const baseSymbol = extractBaseSymbol(order.symbol)
  
  return {
    ...order,
    side,
    absQuantity,
    remainingQty,
    isFullyFilled,
    isMatchable,
    isCanceled,
    isWorking,
    baseSymbol
  }
}

/**
 * Determine order side based on quantity (Phoenix rule: negative = SELL, positive = BUY)
 */
function determineOrderSide(order: PhoenixOrder): 'BUY' | 'SELL' {
  // Phoenix rule: quantity < 0 = SELL, quantity > 0 = BUY
  if (order.totalQty < 0) {
    return 'SELL'
  } else if (order.totalQty > 0) {
    return 'BUY'
  }
  
  // If quantity is 0, try to determine from filled quantity
  if (order.filledQty < 0) {
    return 'SELL'
  } else if (order.filledQty > 0) {
    return 'BUY'
  }
  
  // Default fallback (should not happen with valid orders)
  return 'BUY'
}

/**
 * Extract base symbol from Phoenix symbol format
 */
function extractBaseSymbol(symbol: string): string {
  // Remove month code + year digits from Phoenix symbols
  // Examples: MESZ5 -> MES, NQZ5 -> NQ, MNQM5 -> MNQ, MESZ25 -> MES
  const trimmed = symbol.trim().toUpperCase()
  
  // Remove month code + year pattern (e.g., Z5, M5, H25, etc.)
  // Pattern: [A-Z] followed by 1-2 digits at the end
  return trimmed.replace(/[A-Z]\d{1,2}$/, '')
}

/**
 * Filter orders for FIFO processing
 */
export function filterOrdersForFIFO(orders: ProcessedPhoenixOrder[]): ProcessedPhoenixOrder[] {
  return orders.filter(order => 
    order.isMatchable && 
    order.absQuantity > 0 && 
    order.executePrice !== null &&
    order.executeTime !== null &&
    !order.isCanceled
  )
}

/**
 * Sort orders by execution time for FIFO processing
 */
export function sortOrdersByExecutionTime(orders: ProcessedPhoenixOrder[]): ProcessedPhoenixOrder[] {
  return [...orders].sort((a, b) => {
    const timeA = new Date(a.executeTime!).getTime()
    const timeB = new Date(b.executeTime!).getTime()
    return timeA - timeB
  })
}
