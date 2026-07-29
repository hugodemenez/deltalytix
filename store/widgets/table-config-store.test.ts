import { describe, expect, it } from "vitest";
import {
  DEFAULT_TRADE_TABLE_PAGE_SIZE,
  sanitizeTablePageSize,
} from "./table-config-store";

describe("sanitizeTablePageSize", () => {
  it("returns fallback for zero, negative, and non-finite values", () => {
    expect(sanitizeTablePageSize(0)).toBe(DEFAULT_TRADE_TABLE_PAGE_SIZE);
    expect(sanitizeTablePageSize(-5)).toBe(DEFAULT_TRADE_TABLE_PAGE_SIZE);
    expect(sanitizeTablePageSize(NaN)).toBe(DEFAULT_TRADE_TABLE_PAGE_SIZE);
    expect(sanitizeTablePageSize(Infinity)).toBe(DEFAULT_TRADE_TABLE_PAGE_SIZE);
    expect(sanitizeTablePageSize(undefined)).toBe(DEFAULT_TRADE_TABLE_PAGE_SIZE);
    expect(sanitizeTablePageSize(null)).toBe(DEFAULT_TRADE_TABLE_PAGE_SIZE);
    expect(sanitizeTablePageSize("0")).toBe(DEFAULT_TRADE_TABLE_PAGE_SIZE);
  });

  it("accepts positive page sizes and floors fractions", () => {
    expect(sanitizeTablePageSize(1)).toBe(1);
    expect(sanitizeTablePageSize(50)).toBe(50);
    expect(sanitizeTablePageSize(10.9)).toBe(10);
    expect(sanitizeTablePageSize("25")).toBe(25);
  });

  it("supports a custom fallback", () => {
    expect(sanitizeTablePageSize(0, 10)).toBe(10);
  });
});
