import { z } from 'zod/v3';

export const financialInstrumentSchema = z.object({
  symbol: z.string().describe("The instrument symbol (e.g., MESM5, MNQM5)"),
  description: z.string().describe("The instrument description (e.g., MES 20JUN25)"),
  conid: z.string().describe("The contract ID"),
  underlying: z.string().describe("The underlying asset (e.g., MES, MNQ)"),
  listingExchange: z.string().describe("The exchange where it's listed (e.g., CME)"),
  multiplier: z.number().describe("The contract multiplier"),
  expiry: z.string().describe("The expiry date (YYYY-MM-DD format)"),
  deliveryMonth: z.string().describe("The delivery month (YYYY-MM format)"),
  instrumentType: z.string().describe("The type of instrument (e.g., Futures, Options)")
});

export type FinancialInstrument = z.infer<typeof financialInstrumentSchema>; 