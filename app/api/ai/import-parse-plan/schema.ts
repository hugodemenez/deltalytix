import { z } from "zod/v3";

export const importParsePlanSchema = z.object({
  kind: z
    .enum(["closed-trades", "orders"])
    .describe(
      "closed-trades: each row is already an entry+exit. orders: each row is a fill that must be paired.",
    ),
  columns: z.object({
    instrument: z.string().nullable(),
    quantity: z.string().nullable(),
    entryPrice: z.string().nullable(),
    closePrice: z.string().nullable(),
    entryDate: z.string().nullable(),
    closeDate: z.string().nullable(),
    pnl: z.string().nullable(),
    side: z.string().nullable(),
    commission: z.string().nullable(),
    accountNumber: z.string().nullable(),
    entryId: z.string().nullable(),
    closeId: z.string().nullable(),
    timeInPosition: z.string().nullable(),
  }),
});
