export interface IgImportedTrade {
  quantity: number;
  instrument: string;
  entryPrice: string;
  closePrice: string;
  entryDate: string;
  closeDate: string;
  pnl: number;
  timeInPosition: number;
  side: "long" | "short";
  commission: number;
  closeId: string;
  comment: string;
}

/** Normalized closed-deal row shared by CSV import and REST sync. */
export interface IgTransactionRecord {
  instrumentName: string;
  reference: string;
  openLevel: string;
  closeLevel: string;
  size: string;
  /** Prefer numeric PL Amount when present; otherwise profitAndLoss. */
  plAmount?: string;
  profitAndLoss?: string;
  cashTransaction?: boolean | string;
  dateUtc: string;
  openDateUtc: string;
  currency?: string;
}

export type IgSkippedRowReason =
  | "cash-transaction"
  | "incomplete-trade"
  | "invalid-number"
  | "invalid-date";

export interface IgSkippedRow {
  rowNumber: number;
  reason: IgSkippedRowReason;
}

export type IgImportErrorCode = "activity-history" | "missing-columns";

export class IgImportError extends Error {
  constructor(
    public readonly code: IgImportErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "IgImportError";
  }
}

const REQUIRED_HEADERS = [
  "MarketName",
  "Reference",
  "Open level",
  "Close level",
  "Size",
  "PL Amount",
  "DateUtc",
  "OpenDateUtc",
] as const;

function normalizeHeader(value: string): string {
  return value.replace(/^\uFEFF/, "").trim();
}

function buildHeaderIndex(headers: string[]): Map<string, number> {
  return new Map(
    headers.map((header, index) => [normalizeHeader(header).toLowerCase(), index]),
  );
}

export function parseIgNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;

  let normalized = value
    .trim()
    .replace(/[\s\u00A0]/g, "")
    .replace(/[€£$]/g, "");

  // IG sometimes prefixes P&L with a currency letter (e.g. "E10.06" for EUR).
  if (/^[A-Za-z](?=[+-]?\d)/.test(normalized)) {
    normalized = normalized.slice(1);
  }

  const isNegative = normalized.startsWith("(") && normalized.endsWith(")");
  if (isNegative) normalized = normalized.slice(1, -1);

  const commaIndex = normalized.lastIndexOf(",");
  const dotIndex = normalized.lastIndexOf(".");
  if (commaIndex >= 0 && dotIndex >= 0) {
    const decimalSeparator = commaIndex > dotIndex ? "," : ".";
    const thousandsSeparator = decimalSeparator === "," ? "." : ",";
    normalized = normalized.replaceAll(thousandsSeparator, "");
    if (decimalSeparator === ",") normalized = normalized.replace(",", ".");
  } else if (commaIndex >= 0) {
    normalized = normalized.replace(",", ".");
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return undefined;
  return isNegative ? -parsed : parsed;
}

export function parseIgUtcDate(value: string | undefined): string | undefined {
  if (!value?.trim()) return undefined;

  const trimmed = value.trim();
  const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(trimmed);
  const date = new Date(hasTimezone ? trimmed : `${trimmed}Z`);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export function cleanIgInstrument(value: string): string {
  return value
    .replace(
      /\s+(?:converted at|converti(?:e)?\s+[àa])\s+[-+]?\d+(?:[.,]\d+)?\s*$/i,
      "",
    )
    .trim();
}

function isCashTransaction(value: boolean | string | undefined): boolean {
  if (typeof value === "boolean") return value;
  return value?.toLowerCase() === "true";
}

type MapResult =
  | { ok: true; trade: IgImportedTrade }
  | { ok: false; reason: IgSkippedRowReason };

function mapOneIgTransaction(record: IgTransactionRecord): MapResult {
  if (isCashTransaction(record.cashTransaction)) {
    return { ok: false, reason: "cash-transaction" };
  }

  const instrument = cleanIgInstrument(record.instrumentName || "");
  const reference = record.reference?.trim() || "";
  const entryPrice = parseIgNumber(record.openLevel);
  const closePrice = parseIgNumber(record.closeLevel);
  const signedSize = parseIgNumber(record.size);
  const pnl =
    parseIgNumber(record.plAmount) ?? parseIgNumber(record.profitAndLoss);
  const entryDate = parseIgUtcDate(record.openDateUtc);
  const closeDate = parseIgUtcDate(record.dateUtc);

  if (!instrument || !reference) {
    return { ok: false, reason: "incomplete-trade" };
  }

  if (
    entryPrice === undefined ||
    closePrice === undefined ||
    signedSize === undefined ||
    signedSize === 0 ||
    pnl === undefined
  ) {
    return { ok: false, reason: "invalid-number" };
  }

  const quantity = Math.abs(signedSize);

  if (!entryDate || !closeDate || new Date(closeDate) < new Date(entryDate)) {
    return { ok: false, reason: "invalid-date" };
  }

  const currency = record.currency?.trim();
  return {
    ok: true,
    trade: {
      quantity,
      instrument,
      entryPrice: entryPrice.toString(),
      closePrice: closePrice.toString(),
      entryDate,
      closeDate,
      pnl,
      timeInPosition:
        (new Date(closeDate).getTime() - new Date(entryDate).getTime()) / 1000,
      side: signedSize > 0 ? "long" : "short",
      commission: 0,
      closeId: reference,
      comment: `IG trade ${reference}${currency ? ` (${currency})` : ""}`,
    },
  };
}

/**
 * Map normalized IG closed-deal records to journal trades.
 * Used by REST `/history/transactions` sync (and tests).
 */
export function mapIgTransactionRecords(
  records: IgTransactionRecord[],
): { trades: IgImportedTrade[]; skippedRows: IgSkippedRow[] } {
  const trades: IgImportedTrade[] = [];
  const skippedRows: IgSkippedRow[] = [];

  records.forEach((record, index) => {
    const result = mapOneIgTransaction(record);
    if (result.ok) {
      trades.push(result.trade);
    } else {
      skippedRows.push({ rowNumber: index + 1, reason: result.reason });
    }
  });

  return { trades, skippedRows };
}

export function parseIgTransactionHistory(
  headers: string[],
  rows: string[][],
): { trades: IgImportedTrade[]; skippedRows: IgSkippedRow[] } {
  const headerIndex = buildHeaderIndex(headers);

  if (headerIndex.has("textepic") && headerIndex.has("activityhistoryid")) {
    throw new IgImportError(
      "activity-history",
      "IG Activity History cannot be imported as completed trades.",
    );
  }

  const missingHeaders = REQUIRED_HEADERS.filter(
    (header) => !headerIndex.has(header.toLowerCase()),
  );
  if (missingHeaders.length > 0) {
    throw new IgImportError(
      "missing-columns",
      `Missing IG Transaction History columns: ${missingHeaders.join(", ")}`,
    );
  }

  const get = (row: string[], header: string) => {
    const index = headerIndex.get(header.toLowerCase());
    return index === undefined ? undefined : row[index]?.trim();
  };

  const trades: IgImportedTrade[] = [];
  const skippedRows: IgSkippedRow[] = [];

  rows.forEach((row, rowIndex) => {
    if (!row.some((cell) => cell?.trim())) return;

    const result = mapOneIgTransaction({
      instrumentName: get(row, "MarketName") || "",
      reference: get(row, "Reference") || "",
      openLevel: get(row, "Open level") || "",
      closeLevel: get(row, "Close level") || "",
      size: get(row, "Size") || "",
      plAmount: get(row, "PL Amount"),
      profitAndLoss: get(row, "ProfitAndLoss"),
      cashTransaction: get(row, "Cash transaction"),
      dateUtc: get(row, "DateUtc") || "",
      openDateUtc: get(row, "OpenDateUtc") || "",
      currency: get(row, "CurrencyIsoCode") || get(row, "Currency"),
    });

    if (result.ok) {
      trades.push(result.trade);
    } else {
      skippedRows.push({ rowNumber: rowIndex + 2, reason: result.reason });
    }
  });

  return { trades, skippedRows };
}
