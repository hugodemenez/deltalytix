import { describe, expect, it } from "vitest";
import {
  executeParsePlan,
  isParsePlanComplete,
  mappingsFromPlan,
  mergeParsePlans,
  missingRequiredFields,
  pairOrderFills,
  planFromHeaders,
  planFromMappings,
} from "./parse-plan";

const USER_CSV = `Symbol;Quantity;Entry DT;Entry Price;Exit DT;Exit Price;ProfitLoss
MNQ;2;2026-01-06 17:35:22;25629.25;2026-01-06 17:51:31.186;25746.5;469
MNQ;1;2026-01-06 17:39:52;25638.75;2026-01-06 17:47:05.497;25702.75;128
MNQ;-2;2026-01-06 18:14:14;25756.5;2026-01-06 18:26:22.417;25778.5;-88
MNQ;-2;2026-01-06 18:14:22;25752.75;2026-01-06 18:25:25.492;25774.75;-88
MNQ;-4;2026-01-06 18:53:05;25707.75;2026-01-06 19:04:36.385;25660;382
MNQ;1;2026-01-07 17:29:51;25788.5;2026-01-07 17:34:26.483;25817.25;57.5
MNQ;3;2026-01-07 17:29:51;25788.5;2026-01-07 17:41:14.630;25844.5;336
MNQ;1;2026-01-07 17:58:23;25863.75;2026-01-07 18:39:04.605;25810.5;-106.5
MNQ;1;2026-01-07 19:58:23;25969.25;2026-01-07 21:15:56.798;25943;-52.5
MNQ;-1;2026-01-07 22:06:18;25942.75;2026-01-07 23:13:04.555;25882.25;121
MNQ;-3;2026-01-08 17:33:01;25749;2026-01-08 17:38:24.780;25681.5;405
MNQ;-2;2026-01-08 17:49:47;25651.75;2026-01-08 18:02:08.169;25572;319
MNQ;2;2026-01-09 17:45:16;25736.5;2026-01-09 18:07:22.652;25660;-306
MNQ;-1;2026-01-09 18:26:01;25818.25;2026-01-09 18:26:29.931;25812.75;11
MNQ;2;2026-01-09 19:47:19;25874.5;2026-01-09 21:36:00.399;25942;270
MNQ;1;2026-01-12 17:51:00;25906.5;2026-01-12 22:27:11.202;26003.25;193.5
MNQ;1;2026-01-12 17:51:00;25906.5;2026-01-12 23:57:00.977;25964.75;116.5`;

function parseSemicolonCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0]?.split(";") ?? [];
  const rows = lines.slice(1).map((line) => line.split(";"));
  return { headers, rows };
}

describe("planFromHeaders", () => {
  it("maps the reported MNQ closed-trade file without AI", () => {
    const { headers } = parseSemicolonCsv(USER_CSV);
    const plan = planFromHeaders(headers);

    expect(plan.kind).toBe("closed-trades");
    expect(plan.columns.instrument?.header).toBe("Symbol");
    expect(plan.columns.quantity?.header).toBe("Quantity");
    expect(plan.columns.entryDate?.header).toBe("Entry DT");
    expect(plan.columns.entryPrice?.header).toBe("Entry Price");
    expect(plan.columns.closeDate?.header).toBe("Exit DT");
    expect(plan.columns.closePrice?.header).toBe("Exit Price");
    expect(plan.columns.pnl?.header).toBe("ProfitLoss");
    expect(isParsePlanComplete(plan)).toBe(true);
    expect(missingRequiredFields(plan)).toEqual([]);
  });

  it("treats a fill-only file as orders", () => {
    const plan = planFromHeaders(["Symbol", "Qty", "Side", "Price", "Time"]);
    expect(plan.kind).toBe("orders");
    expect(plan.columns.instrument?.header).toBe("Symbol");
    expect(plan.columns.quantity?.header).toBe("Qty");
    expect(plan.columns.side?.header).toBe("Side");
    expect(plan.columns.entryPrice?.header).toBe("Price");
    expect(plan.columns.entryDate?.header).toBe("Time");
    expect(isParsePlanComplete(plan)).toBe(true);
  });
});

describe("executeParsePlan", () => {
  it("formats every closed trade from the reported file", () => {
    const { headers, rows } = parseSemicolonCsv(USER_CSV);
    const result = executeParsePlan(rows, planFromHeaders(headers));

    expect(result.skippedRows).toBe(0);
    expect(result.trades).toHaveLength(17);
    expect(result.trades[0]).toMatchObject({
      instrument: "MNQ",
      quantity: 2,
      side: "long",
      entryPrice: "25629.25",
      closePrice: "25746.5",
      pnl: 469,
    });
    expect(result.trades[2]).toMatchObject({
      instrument: "MNQ",
      quantity: 2,
      side: "short",
      pnl: -88,
    });
    expect(result.trades.every((trade) => trade.entryDate && trade.closeDate)).toBe(
      true,
    );
  });

  it("uses explicit mappings over weaker header guesses", () => {
    const headers = ["Symbol", "Qty", "Profit"];
    const heuristic = planFromHeaders(headers);
    const mappings = planFromMappings(headers, {
      Symbol_0: "instrument",
      Qty_1: "quantity",
    });
    const merged = mergeParsePlans(heuristic, mappings);
    expect(merged.columns.pnl?.header).toBe("Profit");
    expect(mappingsFromPlan(headers, merged).Qty_1).toBe("quantity");
  });
});

describe("pairOrderFills", () => {
  it("pairs a buy then sell into one long trade", () => {
    const trades = pairOrderFills([
      {
        instrument: "ES",
        quantity: 1,
        side: "long",
        price: "5000",
        date: "2026-01-06T17:00:00.000Z",
        accountNumber: "A1",
        commission: 1,
        id: "1",
      },
      {
        instrument: "ES",
        quantity: 1,
        side: "short",
        price: "5010",
        date: "2026-01-06T17:05:00.000Z",
        accountNumber: "A1",
        commission: 1,
        id: "2",
      },
    ]);

    expect(trades).toHaveLength(1);
    expect(trades[0]).toMatchObject({
      instrument: "ES",
      quantity: 1,
      side: "long",
      entryPrice: "5000",
      closePrice: "5010",
      pnl: 10,
    });
  });

  it("executes an orders plan into paired trades", () => {
    const headers = ["Symbol", "Qty", "Side", "Price", "Time"];
    const rows = [
      ["ES", "1", "buy", "5000", "2026-01-06 17:00:00"],
      ["ES", "1", "sell", "5010", "2026-01-06 17:05:00"],
    ];
    const result = executeParsePlan(rows, planFromHeaders(headers));
    expect(result.kind).toBe("orders");
    expect(result.trades).toHaveLength(1);
    expect(result.trades[0]?.pnl).toBe(10);
  });
});
