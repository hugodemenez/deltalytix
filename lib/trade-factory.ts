import { Trade } from "@/prisma/generated/prisma/browser";
import { generateTradeHash } from "./utils";

/**
 * Creates a Trade object with schema defaults applied
 * Mirrors the @default() values from schema.prisma
 */
export function createTradeWithDefaults(input: Partial<Trade>): Trade {
  return {
    id: generateTradeHash(input),
    accountNumber: input.accountNumber || "",
    quantity: input.quantity || 0,
    entryId: input.entryId || null,
    closeId: input.closeId || null,
    instrument: input.instrument || "",
    entryPrice: input.entryPrice || "0",
    closePrice: input.closePrice || "0",
    entryDate: input.entryDate || new Date().toISOString(),
    closeDate: input.closeDate || new Date().toISOString(),
    pnl: input.pnl || 0,
    commission: input.commission || 0,
    timeInPosition: input.timeInPosition || 0,
    side: input.side || "",
    comment: input.comment || "",
    imageBase64: input.imageBase64 || null,
    createdAt: new Date(),
    userId: input.userId || "", // Will be set by the parent component
    tags: input.tags || [],
    videoUrl: input.videoUrl || null,
    imageBase64Second: input.imageBase64Second || null,
    groupId: input.groupId || null,
    images: input.images || [],
  } as Trade;
}
