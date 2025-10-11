import { z } from 'zod/v3';

export const orderSchema = z.object({
  rawSymbol: z.string().describe("Raw trading instrument symbol as found in statement (e.g., MNQM5, ESH5@CME)"),
  side: z.enum(["BUY", "SELL"]).describe("Order side - BUY or SELL"),
  quantity: z.number().describe("Number of shares/contracts"),
  price: z.number().describe("Execution price"),
  timestamp: z.string().describe("ISO string timestamp of execution"),
  commission: z.number().optional().describe("Commission charged for this order accounting for additional fees"),
  accountNumber: z.string().optional().describe("Account number"),
  orderId: z.string().optional().describe("Unique identifier for the order if available"),
  orderType: z.string().optional().describe("Order type (MARKET, LIMIT, etc.)"),
})

export const tradeSchema = z.object({
  quantity: z.number().describe("The number of units traded"),
  pnl: z.number().describe("The profit or loss from the trade"),
  commission: z.number().describe("The commission charged for the trade or 0 if not available"),
  timeInPosition: z.number().describe("The duration for which the position was held in seconds"),
  side: z.enum(["long", "short"]).describe("The direction of the trade"),
  entryDate: z.string().describe("The ISO string date when the entry transaction occurred"),
  closeDate: z.string().describe("The ISO string date when the close transaction occurred"),
  instrument: z.string().describe("The trading instrument (e.g. MES, ES, NG, ZN, ZB, etc.)"),
  accountNumber: z.string().describe("The account number associated with the trade"),
  entryPrice: z.string().describe("The price at which the instrument was bought"),
  closePrice: z.string().describe("The price at which the instrument was sold"),
  entryId: z.string().optional().describe("The unique identifier for the entry transaction"),
  closeId: z.string().optional().describe("The unique identifier for the close transaction"),
})