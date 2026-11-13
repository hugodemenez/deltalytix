import { describe, expect, it } from "vitest"
import { gpt6LunaCostUsd } from "./gpt6-luna-price"

describe("gpt6LunaCostUsd", () => {
  it("prices uncached input at $0.10 and output at $0.50 per million", () => {
    expect(
      gpt6LunaCostUsd({ inputTokens: 1_000_000, outputTokens: 1_000_000 }),
    ).toBeCloseTo(0.6)
  })

  it("prices cached input at $0.01 per million", () => {
    expect(
      gpt6LunaCostUsd({
        inputTokens: 1_000_000,
        outputTokens: 0,
        inputTokenDetails: { cacheReadTokens: 1_000_000 },
      }),
    ).toBeCloseTo(0.01)
  })
})
