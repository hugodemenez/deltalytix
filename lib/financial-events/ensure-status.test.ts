import { describe, expect, it } from "vitest"
import {
  FINANCIAL_EVENTS_MAX_ATTEMPTS,
  financialEventsEnsureStatus,
  financialEventsRetryDelayMs,
} from "./ensure-status"

describe("financialEventsEnsureStatus", () => {
  it("stays idle until the dashboard has seeded a window", () => {
    expect(
      financialEventsEnsureStatus({ seeded: false, covered: false, attempts: 0 }),
    ).toBe("idle")
  })

  it("is ready once the visible range is covered, even after earlier failures", () => {
    expect(
      financialEventsEnsureStatus({ seeded: true, covered: true, attempts: 2 }),
    ).toBe("ready")
  })

  it("keeps loading while attempts remain so an empty list is not treated as no news", () => {
    expect(
      financialEventsEnsureStatus({ seeded: true, covered: false, attempts: 0 }),
    ).toBe("loading")
    expect(
      financialEventsEnsureStatus({
        seeded: true,
        covered: false,
        attempts: FINANCIAL_EVENTS_MAX_ATTEMPTS - 1,
      }),
    ).toBe("loading")
  })

  it("is an error only after the last attempt fails", () => {
    expect(
      financialEventsEnsureStatus({
        seeded: true,
        covered: false,
        attempts: FINANCIAL_EVENTS_MAX_ATTEMPTS,
      }),
    ).toBe("error")
  })
})

describe("financialEventsRetryDelayMs", () => {
  it("backs off between retries", () => {
    expect(financialEventsRetryDelayMs(1)).toBe(400)
    expect(financialEventsRetryDelayMs(2)).toBe(800)
  })
})
