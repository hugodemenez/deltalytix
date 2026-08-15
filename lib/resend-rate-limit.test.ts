import { describe, expect, it } from "vitest"
import {
  RESEND_SEND_INTERVAL_MS,
  RESEND_TEAM_REQUESTS_PER_SECOND,
  createResendRequestPacer,
  isResendQuotaError,
  isResendRateLimitError,
} from "./resend-rate-limit"

describe("Resend send limits", () => {
  it("paces below the 10 req/s team cap", () => {
    expect(RESEND_TEAM_REQUESTS_PER_SECOND).toBe(10)
    expect(RESEND_SEND_INTERVAL_MS).toBeGreaterThanOrEqual(100)
    expect(1000 / RESEND_SEND_INTERVAL_MS).toBeLessThanOrEqual(10)
  })
})

describe("isResendRateLimitError", () => {
  it("matches the per-second 429", () => {
    expect(isResendRateLimitError({ name: "rate_limit_exceeded" })).toBe(true)
  })

  it("does not treat quota 429s as a retryable rate limit", () => {
    expect(isResendRateLimitError({ name: "daily_quota_exceeded" })).toBe(false)
    expect(isResendRateLimitError({ name: "monthly_quota_exceeded" })).toBe(
      false,
    )
  })
})

describe("isResendQuotaError", () => {
  it("matches daily and monthly quota 429s", () => {
    expect(isResendQuotaError({ name: "daily_quota_exceeded" })).toBe(true)
    expect(isResendQuotaError({ name: "monthly_quota_exceeded" })).toBe(true)
    expect(isResendQuotaError({ name: "rate_limit_exceeded" })).toBe(false)
  })
})

describe("createResendRequestPacer", () => {
  it("does not wait before the first send", async () => {
    const sleeps: number[] = []
    let now = 1_000
    const pace = createResendRequestPacer(125, {
      now: () => now,
      sleep: async (ms) => {
        sleeps.push(ms)
        now += ms
      },
    })

    await pace()
    expect(sleeps).toEqual([])
  })

  it("waits the remaining interval before the next send", async () => {
    const sleeps: number[] = []
    let now = 1_000
    const pace = createResendRequestPacer(125, {
      now: () => now,
      sleep: async (ms) => {
        sleeps.push(ms)
        now += ms
      },
    })

    await pace()
    now += 40
    await pace()
    expect(sleeps).toEqual([85])
  })

  it("does not stack waits when the previous interval has already elapsed", async () => {
    const sleeps: number[] = []
    let now = 1_000
    const pace = createResendRequestPacer(125, {
      now: () => now,
      sleep: async (ms) => {
        sleeps.push(ms)
        now += ms
      },
    })

    await pace()
    now += 200
    await pace()
    expect(sleeps).toEqual([])
  })
})
