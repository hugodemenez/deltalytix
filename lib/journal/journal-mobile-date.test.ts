import { describe, expect, it } from "vitest"
import { journalMobileDateLine } from "./journal-mobile-date"

describe("journalMobileDateLine", () => {
  it("formats the French proof date with no trades", () => {
    expect(
      journalMobileDateLine(new Date(2026, 10, 3), 0, "fr", {
        none: "aucun trade",
        one: "1 trade",
        many: (count) => `${count} trades`,
      }),
    ).toBe("Mardi 3 novembre · aucun trade")
  })

  it("pluralizes English trade counts", () => {
    expect(
      journalMobileDateLine(new Date(2026, 10, 3), 4, "en", {
        none: "no trades",
        one: "1 trade",
        many: (count) => `${count} trades`,
      }),
    ).toBe("Tuesday 3 November · 4 trades")
  })
})
