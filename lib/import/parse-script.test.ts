import { describe, expect, it } from "vitest";
import { extractParseScript, sampleValidationError } from "./parse-script";
import { parsePeekText } from "./peek-delimited-file";
import { runInVm } from "./run-parse-script";

const MNQ_SCRIPT = `
function parseChunk(rows, session) {
  session = session || {};
  const trades = [];
  let skipped = 0;
  for (const row of rows) {
    if (!row || row.every((cell) => !String(cell || "").trim())) {
      skipped += 1;
      continue;
    }
    const qty = Number(String(row[1]).replace(/,/g, ""));
    if (!Number.isFinite(qty) || !row[0] || !row[2] || !row[3] || !row[4] || !row[5]) {
      skipped += 1;
      continue;
    }
    trades.push({
      instrument: String(row[0]).replace(/[FGHJKMNQUVXZ]\\d{1,2}$/i, ""),
      quantity: Math.abs(qty),
      side: qty < 0 ? "short" : "long",
      entryDate: new Date(row[2]).toISOString(),
      closeDate: new Date(row[4]).toISOString(),
      entryPrice: String(row[3]),
      closePrice: String(row[5]),
      pnl: Number(row[6]) || 0,
      commission: 0,
    });
  }
  return { trades, session, skipped };
}
`;

const NARRATIVE_SCRIPT = `
function parseChunk(rows, session) {
  session = session || {};
  session.opens = session.opens || [];
  const trades = [];
  let skipped = 0;
  const buy = /bought\\s+(\\d+)\\s+(\\w+)\\s+@\\s+([0-9.]+)/i;
  const sell = /sold\\s+(\\d+)\\s+(\\w+)\\s+@\\s+([0-9.]+)/i;
  for (const row of rows) {
    const date = row[0];
    const details = row[1] || "";
    const bought = details.match(buy);
    const sold = details.match(sell);
    if (bought) {
      session.opens.push({
        instrument: bought[2],
        quantity: Number(bought[1]),
        price: bought[3],
        date,
      });
      continue;
    }
    if (sold && session.opens.length) {
      const open = session.opens.shift();
      const qty = Number(sold[1]);
      const close = Number(sold[3]);
      const entry = Number(open.price);
      trades.push({
        instrument: open.instrument,
        quantity: qty,
        side: "long",
        entryDate: new Date(open.date).toISOString(),
        closeDate: new Date(date).toISOString(),
        entryPrice: String(entry),
        closePrice: String(close),
        pnl: (close - entry) * qty,
        commission: 0,
      });
      continue;
    }
    skipped += 1;
  }
  return { trades, session, skipped };
}
`;

describe("extractParseScript", () => {
  it("takes a fenced function and rejects imports", () => {
    const script = extractParseScript(
      "```js\nfunction parseChunk(rows, session) { return { trades: [], session, skipped: 0 }; }\n```",
    );
    expect(script).toContain("function parseChunk");
    expect(() =>
      extractParseScript("function parseChunk() {}\nimport fs from 'fs'"),
    ).toThrow("PARSE_SCRIPT_UNSAFE");
  });
});

describe("runInVm", () => {
  it("parses the reported MNQ layout", () => {
    const peek = parsePeekText(`Symbol;Quantity;Entry DT;Entry Price;Exit DT;Exit Price;ProfitLoss
MNQ;2;2026-01-06 17:35:22;25629.25;2026-01-06 17:51:31;25746.5;469
MNQ;-2;2026-01-06 18:14:14;25756.5;2026-01-06 18:26:22;25778.5;-88`);
    const first = runInVm(MNQ_SCRIPT, peek.sampleRows.slice(0, 1), {});
    expect(first.trades[0]).toMatchObject({
      instrument: "MNQ",
      quantity: 2,
      side: "long",
      pnl: 469,
    });
    const empty = runInVm(MNQ_SCRIPT, [], first.session);
    expect(empty.trades).toEqual([]);
    expect(sampleValidationError(empty)).toBe("SAMPLE_PRODUCED_NO_TRADES");
  });

  it("pairs narrative fills that span chunks", () => {
    const buy = runInVm(
      NARRATIVE_SCRIPT,
      [["2026-01-06", "Bought 2 MNQ @ 25629.25"]],
      {},
    );
    expect(buy.trades).toEqual([]);
    const sell = runInVm(
      NARRATIVE_SCRIPT,
      [["2026-01-06", "Sold 2 MNQ @ 25746.5"]],
      buy.session,
    );
    expect(sell.trades).toHaveLength(1);
    expect(sell.trades[0]?.pnl).toBeCloseTo((25746.5 - 25629.25) * 2);
  });
});
