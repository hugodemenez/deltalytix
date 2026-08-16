import { describe, expect, it } from "vitest";
import { evaluateFormatTradesBatchResult } from "./format-trades-batch";

const formattedTrade = {
  entryDate: "2026-01-06T17:35:22.000Z",
  instrument: "MNQ",
};

describe("evaluateFormatTradesBatchResult", () => {
  it("does not treat an empty onFinish payload as success", () => {
    expect(
      evaluateFormatTradesBatchResult({ object: undefined, error: undefined }),
    ).toEqual({ status: "failed", reason: "invalid", formattedCount: 0 });
  });

  it("does not treat a schema validation error as success", () => {
    expect(
      evaluateFormatTradesBatchResult({
        object: undefined,
        error: new Error("invalid"),
      }),
    ).toEqual({ status: "failed", reason: "error", formattedCount: 0 });
  });

  it("does not treat an empty array as a completed batch", () => {
    expect(evaluateFormatTradesBatchResult({ object: [] })).toEqual({
      status: "failed",
      reason: "empty",
      formattedCount: 0,
    });
  });

  it("does not count trades that are missing an entry date", () => {
    expect(
      evaluateFormatTradesBatchResult({
        object: [{ instrument: "MNQ" }, null],
      }),
    ).toEqual({ status: "failed", reason: "empty", formattedCount: 0 });
  });

  it("accepts a batch that produced formatted trades", () => {
    expect(
      evaluateFormatTradesBatchResult({
        object: [formattedTrade, { instrument: "ES" }],
      }),
    ).toEqual({ status: "success", formattedCount: 1 });
  });
});
