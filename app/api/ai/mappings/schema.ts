import { z } from 'zod/v3';

export const mappingSchema = z.object({
  accountNumber: z
    .string()
    .nullable()
    .describe("The account number or name associated with the trade"),
  instrument: z
    .string()
    .nullable()
    .describe("The trading instrument (e.g., stock symbol, ticker)"),
  entryId: z
    .string()
    .nullable()
    .describe("The unique identifier for the buy transaction"),
  closeId: z
    .string()
    .nullable()
    .describe("The unique identifier for the sell transaction"),
  quantity: z
    .string()
    .nullable()
    .describe("The number of units traded"),
  entryPrice: z
    .string()
    .nullable()
    .describe("The price at which the instrument was bought"),
  closePrice: z
    .string()
    .nullable()
    .describe("The price at which the instrument was sold"),
  entryDate: z
    .string()
    .nullable()
    .describe("The date when the entry / buy (if no side is provided) transaction occurred"),
  closeDate: z
    .string()
    .nullable()
    .describe("The date when the close / sell (if no side is provided) transaction occurred"),
  pnl: z
    .string()
    .nullable()
    .describe("The profit or loss from the trade brut or gross pnl when there is commission"),
  timeInPosition: z
    .string()
    .nullable()
    .describe("The duration for which the position was held"),
  side: z
    .string()
    .nullable()
    .describe("The entry side of the trade (e.g., buy or sell)"),
  commission: z
    .string()
    .nullable()
    .describe("The commission charged for the trade"),
});