import { describe, expect, it } from "vitest";
import { formatCalendarData } from "./utils";
import type { Trade } from "@/prisma/generated/prisma/browser";

function makeTrade(entryDate: string): Trade {
  return {
    entryDate,
    closeDate: entryDate,
    pnl: 100,
    commission: 0,
    side: "long",
    accountNumber: "A1",
    instrument: "MNQ",
    quantity: 1,
  } as Trade;
}

describe("formatCalendarData", () => {
  it("buckets trades by entry date in the user timezone", () => {
    const trades = [makeTrade("2026-06-21T22:00:00.000Z")];

    const calendarData = formatCalendarData(trades, [], "Europe/Paris");

    expect(Object.keys(calendarData)).toEqual(["2026-06-22"]);
    expect(calendarData["2026-06-22"].tradeNumber).toBe(1);
  });

  it("matches UTC day when timezone is UTC", () => {
    const trades = [makeTrade("2026-06-21T22:00:00.000Z")];

    const calendarData = formatCalendarData(trades, [], "UTC");

    expect(Object.keys(calendarData)).toEqual(["2026-06-21"]);
  });
});
