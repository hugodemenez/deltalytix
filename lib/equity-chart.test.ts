import { describe, expect, it } from "vitest";
import {
  computeEquityChartData,
  type EquityChartAccountInput,
  type EquityChartParams,
  type EquityChartTradeInput,
} from "./equity-chart";

function params(overrides: Partial<EquityChartParams> = {}): EquityChartParams {
  return {
    instruments: [],
    accountNumbers: [],
    pnlRange: {},
    tickRange: {},
    timeRange: { range: null },
    tickFilter: { value: null },
    weekdayFilter: { days: [] },
    hourFilter: { hour: null },
    tagFilter: { tags: [] },
    timezone: "UTC",
    showIndividual: false,
    maxAccounts: 8,
    dataSampling: "all",
    selectedAccounts: [],
    ...overrides,
  };
}

function trade(
  entryDate: string,
  pnl: number,
  commission: number | null = 0,
  accountNumber = "A1",
): EquityChartTradeInput {
  return {
    entryDate,
    accountNumber,
    instrument: "ES",
    pnl,
    commission,
    timeInPosition: 60,
    tags: [],
  };
}

function account(
  overrides: Partial<EquityChartAccountInput> = {},
): EquityChartAccountInput {
  return {
    number: "A1",
    groupId: null,
    startingBalance: 100_000,
    resetDate: null,
    payouts: [],
    ...overrides,
  };
}

function pointsByDate(
  trades: EquityChartTradeInput[],
  accounts: EquityChartAccountInput[] = [account()],
) {
  const result = computeEquityChartData(trades, accounts, [], params());
  return Object.fromEntries(result.chartData.map((point) => [point.date, point]));
}

describe("computeEquityChartData daily PnL", () => {
  it("fills dailyPnL, commissions, and netPnL from trades and keeps equity as cumulative net", () => {
    const points = pointsByDate([
      trade("2026-03-02T15:00:00.000Z", 100, 10),
      trade("2026-03-02T16:00:00.000Z", -20, 2),
      trade("2026-03-04T15:00:00.000Z", 50, null, "A2"),
    ], [
      account(),
      account({ number: "A2" }),
    ]);

    expect(points["2026-03-02"]).toMatchObject({
      dailyPnL: 80,
      dailyCommissions: 12,
      netPnL: 68,
      equity: 68,
    });
    // Gap day: nothing traded, equity carries, daily fields stay zero.
    expect(points["2026-03-03"]).toMatchObject({
      dailyPnL: 0,
      dailyCommissions: 0,
      netPnL: 0,
      equity: 68,
    });
    expect(points["2026-03-04"]).toMatchObject({
      dailyPnL: 50,
      dailyCommissions: 0,
      netPnL: 50,
      equity: 118,
    });
  });

  it("keeps payouts in equity and out of the daily PnL fields", () => {
    const points = pointsByDate(
      [
        trade("2026-03-02T15:00:00.000Z", 200, 0),
        trade("2026-03-04T15:00:00.000Z", 30, 5),
      ],
      [
        account({
          payouts: [{ date: "2026-03-03T12:00:00.000Z", amount: 40, status: "PAID" }],
        }),
      ],
    );

    expect(points["2026-03-02"]).toMatchObject({
      dailyPnL: 200,
      dailyCommissions: 0,
      netPnL: 200,
      equity: 200,
    });
    expect(points["2026-03-03"]).toMatchObject({
      dailyPnL: 0,
      dailyCommissions: 0,
      netPnL: 0,
      equity: 160,
    });
    expect(points["2026-03-04"]).toMatchObject({
      dailyPnL: 30,
      dailyCommissions: 5,
      netPnL: 25,
      equity: 185,
    });
  });

  it("drops trades from before a reset and does not count the reset as PnL", () => {
    const points = pointsByDate(
      [
        trade("2026-03-02T15:00:00.000Z", 200, 0),
        trade("2026-03-03T18:00:00.000Z", 30, 5),
      ],
      [account({ resetDate: "2026-03-03T12:00:00.000Z" })],
    );

    expect(points["2026-03-02"]).toBeUndefined();
    expect(points["2026-03-03"]).toMatchObject({
      dailyPnL: 30,
      dailyCommissions: 5,
      netPnL: 25,
      equity: 25,
    });
  });
});
