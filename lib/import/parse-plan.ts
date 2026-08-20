/**
 * Deterministic import "script": infer a parse plan from headers (or AI),
 * then run it in chunks. This is the Eve idea — inspect, write a plan,
 * execute, repair — without embedding the Eve runtime or eval'ing model JS.
 * Never parse a multi-million-row file in one synchronous call from the UI.
 */
import type { Trade } from "@/prisma/generated/prisma/browser";

export const PARSE_PLAN_FIELDS = [
  "instrument",
  "quantity",
  "entryPrice",
  "closePrice",
  "entryDate",
  "closeDate",
  "pnl",
  "side",
  "commission",
  "accountNumber",
  "entryId",
  "closeId",
  "timeInPosition",
] as const;

export type ParsePlanField = (typeof PARSE_PLAN_FIELDS)[number];

export type ParsePlanKind = "closed-trades" | "orders";

export type ParsePlanColumn = {
  header: string;
  index: number;
};

export type ParsePlan = {
  kind: ParsePlanKind;
  columns: Partial<Record<ParsePlanField, ParsePlanColumn>>;
  quantitySignIsSide: boolean;
};

export type ParsePlanSource = "heuristic" | "mappings" | "ai";

export type ExecutedTrade = Partial<Trade> & {
  entryDate?: string;
};

export type ExecuteParsePlanResult = {
  trades: ExecutedTrade[];
  kind: ParsePlanKind;
  missingRequired: ParsePlanField[];
  skippedRows: number;
};

/** Rows per chunk. Large enough to stay fast, small enough to yield the UI. */
export const PARSE_PLAN_CHUNK_SIZE = 2_500;

/** Rows shown in Review Trades. The full set is kept for save. */
export const PARSE_PREVIEW_LIMIT = 200;

type OpenLot = {
  quantity: number;
  price: number;
  date: string;
  commission: number;
  id: string;
};

type LotBook = {
  longs: OpenLot[];
  shorts: OpenLot[];
};

export type ParsePlanSession = {
  skippedRows: number;
  books: Map<string, LotBook>;
};

export function createParsePlanSession(): ParsePlanSession {
  return { skippedRows: 0, books: new Map() };
}

const HEADER_ALIASES: Record<ParsePlanField, string[]> = {
  instrument: ["instrument", "symbol", "ticker", "sym", "contract", "product"],
  quantity: ["quantity", "qty", "amount", "size", "lots", "contracts"],
  entryPrice: [
    "entryprice",
    "entry price",
    "buyprice",
    "buy price",
    "openprice",
    "open price",
    "avgentry",
    "price",
    "fillprice",
    "fill price",
  ],
  closePrice: [
    "closeprice",
    "close price",
    "exitprice",
    "exit price",
    "sellprice",
    "sell price",
  ],
  entryDate: [
    "entrydate",
    "entry date",
    "entrydt",
    "entry dt",
    "buydate",
    "buy date",
    "opendate",
    "open date",
    "entrytime",
    "open time",
    "time",
    "timestamp",
    "datetime",
    "date",
  ],
  closeDate: [
    "closedate",
    "close date",
    "exitdate",
    "exit date",
    "exitdt",
    "exit dt",
    "selldate",
    "sell date",
    "closetime",
    "close time",
  ],
  pnl: [
    "pnl",
    "profitloss",
    "profit loss",
    "profit",
    "pl",
    "netpnl",
    "net pnl",
    "realizedpnl",
    "realized",
  ],
  side: ["side", "direction", "bs", "buysell", "buy/sell"],
  commission: ["commission", "fee", "fees", "comm"],
  accountNumber: [
    "accountnumber",
    "account number",
    "account",
    "acct",
    "accountid",
  ],
  entryId: ["entryid", "buyid", "buyorderid", "entryorderid"],
  closeId: ["closeid", "sellid", "sellorderid", "exitid"],
  timeInPosition: ["timeinposition", "time in position", "duration", "holdtime"],
};

export function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/[_\-./]+/g, " ")
    .replace(/[^a-z0-9 ]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function columnId(header: string, index: number): string {
  return `${header}_${index}`;
}

function aliasScore(normalizedHeader: string, alias: string): number {
  const compactHeader = normalizedHeader.replace(/\s+/g, "");
  const compactAlias = alias.replace(/\s+/g, "");
  if (compactHeader === compactAlias) return 100 + compactAlias.length;
  if (compactHeader.includes(compactAlias) && compactAlias.length >= 3) {
    return 40 + compactAlias.length;
  }
  return 0;
}

export function planFromHeaders(headers: string[]): ParsePlan {
  const columns: ParsePlan["columns"] = {};
  const usedIndexes = new Set<number>();

  for (const field of PARSE_PLAN_FIELDS) {
    let best:
      | { index: number; header: string; score: number }
      | undefined;
    headers.forEach((header, index) => {
      if (usedIndexes.has(index)) return;
      const normalized = normalizeHeader(header);
      let score = 0;
      for (const alias of HEADER_ALIASES[field]) {
        score = Math.max(score, aliasScore(normalized, alias));
      }
      if (score > 0 && (!best || score > best.score)) {
        best = { index, header, score };
      }
    });
    if (best) {
      columns[field] = { header: best.header, index: best.index };
      usedIndexes.add(best.index);
    }
  }

  return {
    kind: inferKind(columns),
    columns,
    quantitySignIsSide: !columns.side,
  };
}

export function planFromMappings(
  headers: string[],
  mappings: Record<string, string>,
): ParsePlan {
  const columns: ParsePlan["columns"] = {};
  headers.forEach((header, index) => {
    const field = mappings[columnId(header, index)];
    if (!field || !isParsePlanField(field)) return;
    columns[field] = { header, index };
  });
  return {
    kind: inferKind(columns),
    columns,
    quantitySignIsSide: !columns.side,
  };
}

export function resolveParsePlan(
  headers: string[],
  mappings: Record<string, string> = {},
): ParsePlan {
  const heuristic = planFromHeaders(headers);
  if (Object.keys(mappings).length === 0) return heuristic;
  return mergeParsePlans(heuristic, planFromMappings(headers, mappings));
}

export function mergeParsePlans(base: ParsePlan, override: ParsePlan): ParsePlan {
  const columns = { ...base.columns, ...override.columns };
  return {
    kind: override.kind || inferKind(columns),
    columns,
    quantitySignIsSide:
      override.columns.side !== undefined
        ? false
        : base.quantitySignIsSide && !columns.side,
  };
}

export function mappingsFromPlan(
  headers: string[],
  plan: ParsePlan,
): Record<string, string> {
  const mappings: Record<string, string> = {};
  for (const [field, column] of Object.entries(plan.columns)) {
    if (!column) continue;
    if (headers[column.index] !== column.header) continue;
    mappings[columnId(column.header, column.index)] = field;
  }
  return mappings;
}

export function missingRequiredFields(plan: ParsePlan): ParsePlanField[] {
  const required: ParsePlanField[] =
    plan.kind === "orders"
      ? ["instrument", "quantity", "entryDate", "entryPrice"]
      : ["instrument", "quantity", "entryDate", "entryPrice", "closeDate", "closePrice"];
  return required.filter((field) => !plan.columns[field]);
}

export function isParsePlanComplete(plan: ParsePlan): boolean {
  return missingRequiredFields(plan).length === 0;
}

export function parseNumber(value: string | undefined): number | null {
  if (value == null) return null;
  const cleaned = value.replace(/[$€£,\s]/g, "").trim();
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseDateToIso(value: string | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const candidates = [
    trimmed,
    trimmed.includes("T") ? trimmed : trimmed.replace(" ", "T"),
  ];
  for (const candidate of candidates) {
    const parsed = Date.parse(candidate);
    if (!Number.isNaN(parsed)) return new Date(parsed).toISOString();
  }
  return null;
}

export function normalizeSide(
  value: string | undefined,
  quantity: number,
  quantitySignIsSide: boolean,
): "long" | "short" {
  const token = (value ?? "").trim().toLowerCase();
  if (token === "long" || token === "buy" || token === "b" || token === "1") {
    return "long";
  }
  if (token === "short" || token === "sell" || token === "s" || token === "-1") {
    return "short";
  }
  if (quantitySignIsSide && quantity < 0) return "short";
  return "long";
}

export function normalizeInstrument(value: string): string {
  const clean = value.trim().toUpperCase();
  if (clean.length > 2 && /[FGHJKMNQUVXZ]\d{1,2}$/.test(clean)) {
    return clean.replace(/[FGHJKMNQUVXZ]\d{1,2}$/, "");
  }
  return value.trim();
}

function cell(row: string[], column: ParsePlanColumn | undefined): string {
  if (!column) return "";
  return row[column.index] ?? "";
}

function secondsBetween(startIso: string, endIso: string): number {
  const start = Date.parse(startIso);
  const end = Date.parse(endIso);
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  return Math.max(0, Math.round((end - start) / 1000));
}

type ParsedRow =
  | { type: "skip" }
  | { type: "trade"; trade: ExecutedTrade }
  | { type: "fill"; fill: OrderFill };

function parseRow(row: string[], plan: ParsePlan): ParsedRow {
  if (!row.length || row.every((value) => !value?.trim())) {
    return { type: "skip" };
  }

  const rawQuantity = parseNumber(cell(row, plan.columns.quantity));
  const instrument = normalizeInstrument(cell(row, plan.columns.instrument));
  const entryDate = parseDateToIso(cell(row, plan.columns.entryDate));
  const entryPrice = cell(row, plan.columns.entryPrice).trim();

  if (rawQuantity == null || !instrument || !entryDate || !entryPrice) {
    return { type: "skip" };
  }

  const side = normalizeSide(
    cell(row, plan.columns.side),
    rawQuantity,
    plan.quantitySignIsSide,
  );
  const quantity = Math.abs(rawQuantity);
  const accountNumber = cell(row, plan.columns.accountNumber).trim();
  const commission = parseNumber(cell(row, plan.columns.commission)) ?? 0;

  if (plan.kind === "orders") {
    return {
      type: "fill",
      fill: {
        instrument,
        quantity,
        side,
        price: entryPrice,
        date: entryDate,
        accountNumber,
        commission,
        id: cell(row, plan.columns.entryId).trim(),
      },
    };
  }

  const closeDate = parseDateToIso(cell(row, plan.columns.closeDate));
  const closePrice = cell(row, plan.columns.closePrice).trim();
  if (!closeDate || !closePrice) {
    return { type: "skip" };
  }

  const pnl = parseNumber(cell(row, plan.columns.pnl)) ?? 0;
  const timeInPosition =
    parseNumber(cell(row, plan.columns.timeInPosition)) ??
    secondsBetween(entryDate, closeDate);

  return {
    type: "trade",
    trade: {
      instrument,
      quantity,
      side,
      entryDate,
      closeDate,
      entryPrice,
      closePrice,
      pnl,
      commission,
      timeInPosition,
      accountNumber,
      entryId: cell(row, plan.columns.entryId).trim() || undefined,
      closeId: cell(row, plan.columns.closeId).trim() || undefined,
    },
  };
}

function bookKey(fill: OrderFill): string {
  return `${fill.accountNumber}::${fill.instrument}`;
}

function getBook(session: ParsePlanSession, fill: OrderFill): LotBook {
  const key = bookKey(fill);
  const existing = session.books.get(key);
  if (existing) return existing;
  const created: LotBook = { longs: [], shorts: [] };
  session.books.set(key, created);
  return created;
}

/**
 * Apply one chunk. Closed-trade rows are independent. Order fills keep
 * open lots on `session` so a buy in chunk 1 can close in chunk 4000.
 * An empty chunk is not a failure — later rows may still produce trades.
 */
export function executeParsePlanChunk(
  rows: string[][],
  plan: ParsePlan,
  session: ParsePlanSession,
): { trades: ExecutedTrade[] } {
  const trades: ExecutedTrade[] = [];
  for (const row of rows) {
    const parsed = parseRow(row, plan);
    if (parsed.type === "skip") {
      session.skippedRows += 1;
      continue;
    }
    if (parsed.type === "trade") {
      trades.push(parsed.trade);
      continue;
    }
    trades.push(...applyFill(parsed.fill, getBook(session, parsed.fill)));
  }
  return { trades };
}

export function executeParsePlan(
  rows: string[][],
  plan: ParsePlan,
): ExecuteParsePlanResult {
  const missingRequired = missingRequiredFields(plan);
  if (missingRequired.length > 0) {
    return { trades: [], kind: plan.kind, missingRequired, skippedRows: rows.length };
  }

  if (plan.kind === "closed-trades") {
    const session = createParsePlanSession();
    const { trades } = executeParsePlanChunk(rows, plan, session);
    return { trades, kind: plan.kind, missingRequired, skippedRows: session.skippedRows };
  }

  const fills: OrderFill[] = [];
  let skippedRows = 0;
  for (const row of rows) {
    const parsed = parseRow(row, plan);
    if (parsed.type === "skip") {
      skippedRows += 1;
      continue;
    }
    if (parsed.type === "fill") fills.push(parsed.fill);
  }

  return {
    trades: pairOrderFills(fills),
    kind: plan.kind,
    missingRequired,
    skippedRows,
  };
}

export type OrderFill = {
  instrument: string;
  quantity: number;
  side: "long" | "short";
  price: string;
  date: string;
  accountNumber: string;
  commission: number;
  id: string;
};

export function pairOrderFills(fills: OrderFill[]): ExecutedTrade[] {
  const groups = new Map<string, OrderFill[]>();
  for (const fill of fills) {
    const key = bookKey(fill);
    const list = groups.get(key) ?? [];
    list.push(fill);
    groups.set(key, list);
  }

  const trades: ExecutedTrade[] = [];
  for (const group of groups.values()) {
    group.sort((a, b) => a.date.localeCompare(b.date));
    const book: LotBook = { longs: [], shorts: [] };
    for (const fill of group) {
      trades.push(...applyFill(fill, book));
    }
  }
  return trades;
}

function applyFill(fill: OrderFill, book: LotBook): ExecutedTrade[] {
  const incoming: OpenLot = {
    quantity: fill.quantity,
    price: Number(fill.price),
    date: fill.date,
    commission: fill.commission,
    id: fill.id,
  };
  const opposite = fill.side === "long" ? book.shorts : book.longs;
  const same = fill.side === "long" ? book.longs : book.shorts;
  const trades: ExecutedTrade[] = [];

  while (incoming.quantity > 0 && opposite.length > 0) {
    const open = opposite[0];
    const matched = Math.min(incoming.quantity, open.quantity);
    const entryPrice = open.price;
    const closePrice = incoming.price;
    const pnl =
      fill.side === "long"
        ? (entryPrice - closePrice) * matched
        : (closePrice - entryPrice) * matched;

    trades.push({
      instrument: fill.instrument,
      accountNumber: fill.accountNumber,
      quantity: matched,
      side: fill.side === "long" ? "short" : "long",
      entryDate: open.date,
      closeDate: fill.date,
      entryPrice: String(entryPrice),
      closePrice: String(closePrice),
      pnl,
      commission: open.commission + incoming.commission,
      timeInPosition: secondsBetween(open.date, fill.date),
      entryId: open.id || undefined,
      closeId: fill.id || undefined,
    });

    incoming.quantity -= matched;
    open.quantity -= matched;
    if (open.quantity <= 0) opposite.shift();
  }

  if (incoming.quantity > 0) {
    same.push(incoming);
  }

  return trades;
}

function inferKind(columns: ParsePlan["columns"]): ParsePlanKind {
  if (columns.closeDate || columns.closePrice || columns.pnl) {
    return "closed-trades";
  }
  return "orders";
}

function isParsePlanField(value: string): value is ParsePlanField {
  return (PARSE_PLAN_FIELDS as readonly string[]).includes(value);
}
