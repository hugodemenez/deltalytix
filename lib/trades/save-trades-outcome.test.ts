import { describe, expect, it } from "vitest"
import { isDuplicateTradesOnlySave } from "./save-trades-outcome"

describe("isDuplicateTradesOnlySave", () => {
  it("is true only when nothing was inserted and nothing was updated", () => {
    expect(isDuplicateTradesOnlySave(0, 0)).toBe(true)
  })

  it("is false when createMany inserted rows", () => {
    expect(isDuplicateTradesOnlySave(3, 0)).toBe(false)
  })

  it("is false when existing Protocol rows received a commission backfill", () => {
    expect(isDuplicateTradesOnlySave(0, 4)).toBe(false)
  })

  it("is false when both inserts and commission updates happened", () => {
    expect(isDuplicateTradesOnlySave(2, 1)).toBe(false)
  })
})
