import { describe, expect, it } from "vitest";
import { isParsePlanComplete } from "./parse-plan";
import { planFromAiResponse } from "./plan-from-ai";

describe("planFromAiResponse", () => {
  it("resolves header names to column indexes", () => {
    const plan = planFromAiResponse(
      ["Symbol", "Qty", "Side", "Price", "Time"],
      {
        kind: "orders",
        columns: {
          instrument: "Symbol",
          quantity: "Qty",
          side: "Side",
          entryPrice: "Price",
          entryDate: "Time",
          closePrice: null,
          closeDate: null,
          pnl: null,
          commission: null,
          accountNumber: null,
          entryId: null,
          closeId: null,
          timeInPosition: null,
        },
      },
    );

    expect(plan.kind).toBe("orders");
    expect(plan.columns.entryPrice).toEqual({ header: "Price", index: 3 });
    expect(isParsePlanComplete(plan)).toBe(true);
  });

  it("ignores headers that are not in the file", () => {
    const plan = planFromAiResponse(["Symbol"], {
      kind: "closed-trades",
      columns: { instrument: "Ticker" },
    });
    expect(plan.columns.instrument).toBeUndefined();
  });
});
