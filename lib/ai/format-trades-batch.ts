export type FormatTradesBatchFailureReason = "error" | "empty" | "invalid";

export type FormatTradesBatchResult =
  | { status: "success"; formattedCount: number }
  | {
      status: "failed";
      reason: FormatTradesBatchFailureReason;
      formattedCount: 0;
    };

function hasEntryDate(trade: unknown): boolean {
  if (!trade || typeof trade !== "object") return false;
  if (!("entryDate" in trade)) return false;
  const entryDate = trade.entryDate;
  return typeof entryDate === "string" && entryDate.length > 0;
}

export function countFormattedTrades(object: unknown): number {
  if (!Array.isArray(object)) return 0;
  return object.filter(hasEntryDate).length;
}

/**
 * useObject always calls onFinish when the HTTP stream closes — including
 * empty bodies, schema mismatches, and mid-stream provider failures.
 * Those must not be treated as a completed batch.
 */
export function evaluateFormatTradesBatchResult(event: {
  object: unknown;
  error?: Error;
}): FormatTradesBatchResult {
  if (event.error) {
    return { status: "failed", reason: "error", formattedCount: 0 };
  }
  if (!Array.isArray(event.object)) {
    return { status: "failed", reason: "invalid", formattedCount: 0 };
  }
  const formattedCount = countFormattedTrades(event.object);
  if (formattedCount === 0) {
    return { status: "failed", reason: "empty", formattedCount: 0 };
  }
  return { status: "success", formattedCount };
}
