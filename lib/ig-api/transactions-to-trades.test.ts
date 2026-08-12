import { describe, expect, it } from "vitest";
import { mapIgApiTransactions } from "./transactions-to-trades";
import type { IgApiTransaction } from "./types";
import { parseIgNumber } from "../ig-transaction-import";

function sampleTx(
  overrides: Partial<IgApiTransaction> = {},
): IgApiTransaction {
  return {
    cashTransaction: false,
    closeLevel: "4073.08",
    currency: "E",
    date: "04/08/26",
    dateUtc: "2026-08-04T11:47:24",
    instrumentName: "Spot Gold ($1) converted at 0.861122464",
    openDateUtc: "2026-08-04T11:30:06",
    openLevel: "4061.4",
    period: "-",
    profitAndLoss: "E10.06",
    reference: "XU9KG7AM",
    size: "+1",
    transactionType: "ORDER",
    ...overrides,
  };
}

describe("mapIgApiTransactions", () => {
  it("maps IG REST transaction history into the same trade shape as CSV import", () => {
    const result = mapIgApiTransactions([sampleTx()]);

    expect(result.skippedRows).toEqual([]);
    expect(result.trades).toEqual([
      expect.objectContaining({
        instrument: "Spot Gold ($1)",
        quantity: 1,
        side: "long",
        entryPrice: "4061.4",
        closePrice: "4073.08",
        entryDate: "2026-08-04T11:30:06.000Z",
        closeDate: "2026-08-04T11:47:24.000Z",
        pnl: 10.06,
        closeId: "XU9KG7AM",
      }),
    ]);
  });

  it("skips cash rows and keeps fractional sizes", () => {
    const result = mapIgApiTransactions([
      sampleTx({ cashTransaction: true, reference: "CASH-1" }),
      sampleTx({ size: "+0.5", reference: "FRAC-1", profitAndLoss: "+1.0" }),
    ]);

    expect(result.trades).toEqual([
      expect.objectContaining({
        quantity: 0.5,
        closeId: "FRAC-1",
        pnl: 1,
      }),
    ]);
    expect(result.skippedRows.map((row) => row.reason)).toEqual([
      "cash-transaction",
    ]);
  });
});

describe("parseIgNumber currency letter prefix", () => {
  it("parses E-prefixed P&L values from IG API responses", () => {
    expect(parseIgNumber("E10.06")).toBe(10.06);
    expect(parseIgNumber("+€25.50")).toBe(25.5);
  });
});
