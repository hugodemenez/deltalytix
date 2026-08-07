import { describe, expect, it } from "vitest";
import {
  IgImportError,
  parseIgTransactionHistory,
} from "./ig-transaction-import";

const headers = [
  "\uFEFFTextDate",
  "Summary",
  "MarketName",
  "Period",
  "ProfitAndLoss",
  "Transaction type",
  "Reference",
  "Open level",
  "Close level",
  "Size",
  "Currency",
  "PL Amount",
  "Cash transaction",
  "DateUtc",
  "OpenDateUtc",
  "CurrencyIsoCode",
];

describe("parseIgTransactionHistory", () => {
  it("maps the supplied IG transaction format to a completed long trade", () => {
    const row = [
      "04/08/26",
      "Ordres de clôture",
      "Spot Gold ($1) converted at 0.861122464",
      "-",
      "E10.06",
      "ORDRE",
      "XU9KG7AM",
      "4061.4",
      "4073.08",
      "+1",
      "E",
      "10.06",
      "false",
      "2026-08-04T11:47:24",
      "2026-08-04T11:30:06",
      "EUR",
    ];

    const result = parseIgTransactionHistory(headers, [row]);

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
        timeInPosition: 1038,
        closeId: "XU9KG7AM",
        commission: 0,
      }),
    ]);
  });

  it("uses a negative size for short direction and parses accounting P&L", () => {
    const row = [
      "04/08/26",
      "Closed position",
      "Germany 40",
      "-",
      "(€25.50)",
      "ORDER",
      "CLOSE-1",
      "18500",
      "18525.5",
      "-2",
      "€",
      "(25,50)",
      "false",
      "2026-08-04T12:30:00Z",
      "2026-08-04T12:00:00Z",
      "EUR",
    ];

    const result = parseIgTransactionHistory(headers, [row]);

    expect(result.trades[0]).toEqual(
      expect.objectContaining({ side: "short", quantity: 2, pnl: -25.5 }),
    );
  });

  it("ignores cash activity and reports fractional quantities explicitly", () => {
    const cashRow = Array(headers.length).fill("");
    cashRow[12] = "true";
    const fractionalRow = [
      "04/08/26", "Closed position", "EUR/USD", "-", "1", "ORDER",
      "CLOSE-2", "1.1", "1.2", "+0.5", "€", "1", "false",
      "2026-08-04T12:30:00", "2026-08-04T12:00:00", "EUR",
    ];

    const result = parseIgTransactionHistory(headers, [cashRow, fractionalRow]);

    expect(result.trades).toEqual([]);
    expect(result.skippedRows).toEqual([
      { rowNumber: 2, reason: "cash-transaction" },
      { rowNumber: 3, reason: "fractional-quantity" },
    ]);
  });

  it("rejects Activity History exports with a clear error", () => {
    expect(() =>
      parseIgTransactionHistory(["TextEpic", "ActivityHistoryId"], []),
    ).toThrowError(IgImportError);

    try {
      parseIgTransactionHistory(["TextEpic", "ActivityHistoryId"], []);
    } catch (error) {
      expect(error).toMatchObject({ code: "activity-history" });
    }
  });
});
