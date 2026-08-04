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

export type IgSkippedRowReason =
  | "cash-transaction"
  | "incomplete-trade"
  | "invalid-number"
  | "invalid-date"
  | "fractional-quantity";

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

function parseNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;

  let normalized = value
    .trim()
    .replace(/[\s\u00A0]/g, "")
    .replace(/[€£$]/g, "");

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

function parseUtcDate(value: string | undefined): string | undefined {
  if (!value?.trim()) return undefined;

  const trimmed = value.trim();
  const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(trimmed);
  const date = new Date(hasTimezone ? trimmed : `${trimmed}Z`);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function cleanInstrument(value: string): string {
  return value
    .replace(
      /\s+(?:converted at|converti(?:e)?\s+[àa])\s+[-+]?\d+(?:[.,]\d+)?\s*$/i,
      "",
    )
    .trim();
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

    if (get(row, "Cash transaction")?.toLowerCase() === "true") {
      skippedRows.push({ rowNumber: rowIndex + 2, reason: "cash-transaction" });
      return;
    }

    const instrument = cleanInstrument(get(row, "MarketName") || "");
    const reference = get(row, "Reference") || "";
    const entryPrice = parseNumber(get(row, "Open level"));
    const closePrice = parseNumber(get(row, "Close level"));
    const signedSize = parseNumber(get(row, "Size"));
    const pnl = parseNumber(get(row, "PL Amount"));
    const entryDate = parseUtcDate(get(row, "OpenDateUtc"));
    const closeDate = parseUtcDate(get(row, "DateUtc"));

    if (!instrument || !reference) {
      skippedRows.push({ rowNumber: rowIndex + 2, reason: "incomplete-trade" });
      return;
    }

    if (
      entryPrice === undefined ||
      closePrice === undefined ||
      signedSize === undefined ||
      signedSize === 0 ||
      pnl === undefined
    ) {
      skippedRows.push({ rowNumber: rowIndex + 2, reason: "invalid-number" });
      return;
    }

    const quantity = Math.abs(signedSize);
    if (!Number.isInteger(quantity)) {
      skippedRows.push({ rowNumber: rowIndex + 2, reason: "fractional-quantity" });
      return;
    }

    if (!entryDate || !closeDate || new Date(closeDate) < new Date(entryDate)) {
      skippedRows.push({ rowNumber: rowIndex + 2, reason: "invalid-date" });
      return;
    }

    const currency = get(row, "CurrencyIsoCode");
    trades.push({
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
    });
  });

  return { trades, skippedRows };
}
