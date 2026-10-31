import { describe, expect, it } from "vitest"
import { tokenSheetOpenAfter } from "./token-sheet-state"

describe("tokenSheetOpenAfter", () => {
  it("keeps the token sheet open after a token is created", () => {
    expect(tokenSheetOpenAfter("created", true)).toBe(true)
  })
  it("only closes when the user closes it", () => {
    expect(tokenSheetOpenAfter("close", true)).toBe(false)
    expect(tokenSheetOpenAfter("open", false)).toBe(true)
  })
})
