/**
 * Contract for an agent-written import parser.
 * The model emits a function, we validate I/O, then run it on every chunk.
 */
import type { ExecutedTrade } from "./parse-plan";

export const PARSE_SCRIPT_MAX_ATTEMPTS = 3;

export type ParseScriptSession = Record<string, unknown>;

export type ParseScriptChunkResult = {
  trades: ExecutedTrade[];
  session: ParseScriptSession;
  skipped: number;
};

export const PARSE_SCRIPT_CONTRACT = `Write a JavaScript function named parseChunk.

Signature:
  function parseChunk(rows, session) -> { trades, session, skipped }

- rows: string[][]  (one chunk of the file; do not assume the whole file)
- session: a JSON object you persist across chunks (open lots, leftover rows, …).
  Initialize any arrays you use (session.opens = session.opens || []).
- Return only closed trades. Keep unmatched fills in session.
- An empty chunk is not a failure. Return { trades: [], session, skipped: 0 }.
- No import, require, fetch, process, or filesystem access.
- Dates as ISO strings. side is "long" or "short". quantity is a positive number.

Each trade:
  instrument, quantity, side, entryDate, closeDate, entryPrice, closePrice,
  pnl (number), commission (number), timeInPosition (seconds, optional),
  accountNumber (optional), entryId (optional), closeId (optional)`;

export function extractParseScript(text: string): string {
  const fenced = text.match(/```(?:javascript|js)?\s*([\s\S]*?)```/i);
  const raw = (fenced?.[1] ?? text).trim();
  if (!/\bfunction\s+parseChunk\s*\(/.test(raw)) {
    throw new Error("PARSE_SCRIPT_MISSING_FUNCTION");
  }
  if (
    /\bimport\b|\brequire\s*\(|\bfetch\s*\(|\bprocess\b|\bXMLHttpRequest\b/.test(
      raw,
    )
  ) {
    throw new Error("PARSE_SCRIPT_UNSAFE");
  }
  return raw;
}

export function validateParseScriptResult(
  raw: unknown,
): ParseScriptChunkResult {
  if (!raw || typeof raw !== "object") {
    throw new Error("PARSE_SCRIPT_INVALID_RESULT");
  }
  const value = raw as Record<string, unknown>;
  if (!Array.isArray(value.trades)) {
    throw new Error("PARSE_SCRIPT_INVALID_TRADES");
  }
  const session =
    value.session && typeof value.session === "object" && !Array.isArray(value.session)
      ? (value.session as ParseScriptSession)
      : {};
  const skipped =
    typeof value.skipped === "number" && Number.isFinite(value.skipped)
      ? value.skipped
      : 0;

  const trades: ExecutedTrade[] = [];
  for (const item of value.trades) {
    const trade = asExecutedTrade(item);
    if (trade) trades.push(trade);
  }

  return { trades, session, skipped };
}

function asExecutedTrade(item: unknown): ExecutedTrade | null {
  if (!item || typeof item !== "object") return null;
  const trade = item as Record<string, unknown>;
  const instrument = String(trade.instrument ?? "").trim();
  const entryDate = String(trade.entryDate ?? "").trim();
  const entryPrice = String(trade.entryPrice ?? "").trim();
  const quantity = Number(trade.quantity);
  if (!instrument || !entryDate || !entryPrice || !Number.isFinite(quantity)) {
    return null;
  }
  const side = trade.side === "short" ? "short" : "long";
  return {
    instrument,
    quantity: Math.abs(quantity),
    side,
    entryDate,
    closeDate: trade.closeDate ? String(trade.closeDate) : undefined,
    entryPrice,
    closePrice: trade.closePrice ? String(trade.closePrice) : undefined,
    pnl: Number(trade.pnl) || 0,
    commission: Number(trade.commission) || 0,
    timeInPosition: Number(trade.timeInPosition) || 0,
    accountNumber: trade.accountNumber ? String(trade.accountNumber) : "",
    entryId: trade.entryId ? String(trade.entryId) : undefined,
    closeId: trade.closeId ? String(trade.closeId) : undefined,
  };
}

export function sampleValidationError(
  result: ParseScriptChunkResult,
): string | null {
  if (result.trades.length > 0) return null;
  return "SAMPLE_PRODUCED_NO_TRADES";
}
