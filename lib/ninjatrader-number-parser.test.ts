import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  formatCurrencyValue,
  formatPriceValue,
  parseLocalizedNumber,
} from "./ninjatrader-number-parser";

describe("parseLocalizedNumber", () => {
  it("parses European currency values without truncating decimals", () => {
    assert.deepEqual(formatCurrencyValue("1 234,56 €"), { pnl: 1234.56 });
    assert.deepEqual(formatCurrencyValue("-1 234,56 €"), { pnl: -1234.56 });
  });

  it("parses US and European thousands separators", () => {
    assert.deepEqual(parseLocalizedNumber("$1,234.56"), { value: 1234.56 });
    assert.deepEqual(parseLocalizedNumber("1.234,56"), { value: 1234.56 });
  });

  it("normalizes comma-decimal prices", () => {
    assert.deepEqual(formatPriceValue("4567,25"), { price: 4567.25 });
  });
});
