import { beforeEach, describe, expect, it } from "vitest"
import { useFinancialEventsStore } from "@/store/widgets/financial-events-store"
import {
  FINANCIAL_EVENT_LOAD_ATTEMPTS,
  financialEventLoadKey,
  performFinancialEventLoad,
  shouldLoadFinancialEvents,
} from "./ensure-load"

const start = Date.parse("2026-03-01T05:00:00.000Z")
const end = Date.parse("2026-04-01T03:59:59.999Z")

describe("useEnsureFinancialEvents load decisions", () => {
  beforeEach(() => {
    useFinancialEventsStore.setState({
      events: [],
      loadedRanges: [],
      initialized: true,
      isLoading: false,
      loadErrors: {},
    })
  })

  it("retries a failed fetch and does not mark the window loaded", async () => {
    const key = financialEventLoadKey("en", start, end)
    const range = { start: new Date(start), end: new Date(end), lang: "en" }
    let fetches = 0

    for (let step = 0; step < 5; step += 1) {
      const state = useFinancialEventsStore.getState()
      const decision = shouldLoadFinancialEvents({
        initialized: state.initialized,
        covered: false,
        attempts: state.loadErrors[key]?.attempts ?? 0,
      })
      if (decision !== "load") break
      await performFinancialEventLoad({
        fetchWindow: async () => {
          fetches += 1
          throw new Error("db down")
        },
        merge: (events) => {
          useFinancialEventsStore.getState().mergeEvents(events, range)
        },
        fail: (message) => {
          useFinancialEventsStore.getState().noteLoadFailure(key, range, message)
        },
      })
    }

    const after = useFinancialEventsStore.getState()
    expect(fetches).toBe(FINANCIAL_EVENT_LOAD_ATTEMPTS)
    expect(after.loadedRanges).toEqual([])
    expect(after.events).toEqual([])
    expect(after.loadErrors[key]).toMatchObject({ attempts: 3, message: "db down" })
    expect(
      shouldLoadFinancialEvents({
        initialized: true,
        covered: false,
        attempts: after.loadErrors[key].attempts,
      }),
    ).toBe("error")

    after.retryFinancialEventLoad(key)
    expect(useFinancialEventsStore.getState().loadErrors[key]?.attempts).toBe(0)
    expect(
      shouldLoadFinancialEvents({ initialized: true, covered: false, attempts: 0 }),
    ).toBe("load")
  })

  it("marks the window loaded only after a successful fetch", async () => {
    const key = financialEventLoadKey("en", start, end)
    const range = { start: new Date(start), end: new Date(end), lang: "en" }
    const event = {
      id: "cpi",
      title: "CPI",
      date: new Date("2026-03-13T13:30:00.000Z"),
      importance: "high",
      type: "indicator",
      description: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      sourceUrl: null,
      country: "US",
      lang: "en",
      timezone: "UTC",
    }

    const decision = shouldLoadFinancialEvents({
      initialized: true,
      covered: false,
      attempts: 0,
    })
    expect(decision).toBe("load")

    const outcome = await performFinancialEventLoad({
      fetchWindow: async () => [event],
      merge: (events) => {
        useFinancialEventsStore.getState().mergeEvents(events, range)
        useFinancialEventsStore.getState().clearLoadError(key)
      },
      fail: (message) => {
        useFinancialEventsStore.getState().noteLoadFailure(key, range, message)
      },
    })

    const after = useFinancialEventsStore.getState()
    expect(outcome).toBe("loaded")
    expect(after.events).toEqual([event])
    expect(after.loadedRanges).toEqual([{ startMs: start, endMs: end, lang: "en" }])
    expect(after.loadErrors[key]).toBeUndefined()
    expect(
      shouldLoadFinancialEvents({
        initialized: true,
        covered: true,
        attempts: 0,
      }),
    ).toBe("skip")
  })

  it("does not load before the dashboard bootstrap initializes the store", () => {
    expect(
      shouldLoadFinancialEvents({ initialized: false, covered: false, attempts: 0 }),
    ).toBe("skip")
  })
})
