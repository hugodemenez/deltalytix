/**
 * Phoenix Order Types
 * 
 * These types represent the proprietary order format from Phoenix trading platform.
 * Based on the order table structure with fields like Symbol, Insert Time, Execute Time, etc.
 */

export interface PhoenixOrder {
  /** Order number/ID */
  orderNumber: number
  
  /** Unique order identifier for linking modifications/cancellations */
  orderId: string
  
  /** Trading symbol (e.g., MESZ5) */
  symbol: string
  
  /** Order insertion timestamp */
  insertTime: string
  
  /** Order execution timestamp (null if not executed) */
  executeTime: string | null
  
  /** Order cancellation timestamp (null if not cancelled) */
  cancelTime: string | null
  
  /** Type of order (e.g., Stop, Market, Limit) */
  orderType: string
  
  /** Order status: "Filled", "Working", "Modified", or "Canceled" */
  status: 'Filled' | 'Working' | 'Modified' | 'Canceled'
  
  /** Rejection or cancellation reason */
  reason: string | null
  
  /** Price at which order was inserted */
  insertPrice: number
  
  /** Price at which order was executed (null if not executed) */
  executePrice: number | null
  
  /** Total quantity ordered (negative = SELL, positive = BUY) */
  totalQty: number
  
  /** Quantity that was filled (negative = SELL, positive = BUY) */
  filledQty: number
  
  /** Order source (e.g., Manual, API) */
  source: string
  
  /** Trading platform */
  platform: string | null
  
  /** IP address from which order was placed */
  ip: string | null
  
  /** Account number */
  accountNumber: string | null
}

/**
 * Processed Phoenix Order
 * 
 * Enhanced version of PhoenixOrder with additional computed fields
 * for easier processing in FIFO algorithms
 */
export interface ProcessedPhoenixOrder extends PhoenixOrder {
  /** Computed side based on quantity (positive = BUY, negative = SELL) */
  side: 'BUY' | 'SELL'
  
  /** Absolute quantity for processing (always positive) */
  absQuantity: number
  
  /** Remaining quantity to be matched (absolute value) */
  remainingQty: number
  
  /** Whether this order is fully filled */
  isFullyFilled: boolean
  
  /** Whether this order can be used for matching */
  isMatchable: boolean
  
  /** Whether this order is canceled */
  isCanceled: boolean
  
  /** Whether this order is working (active) */
  isWorking: boolean
  
  /** Normalized symbol without expiry (e.g., MES from MESZ5) */
  baseSymbol: string
}

/**
 * Phoenix Order Processing Result
 */
export interface PhoenixOrderProcessingResult {
  /** Successfully processed orders */
  processedOrders: ProcessedPhoenixOrder[]
  
  /** Orders that failed processing */
  failedOrders: PhoenixOrder[]
  
  /** Processing errors */
  errors: string[]
  
  /** Summary statistics */
  summary: {
    totalOrders: number
    processedCount: number
    failedCount: number
    filledOrders: number
    rejectedOrders: number
    cancelledOrders: number
  }
}
