// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const fetchWindow = vi.fn()

vi.mock("@/locales/client", () => ({
  useCurrentLocale: () => "en",
}))

vi.mock("@/server/financial-events", () => ({
  getFinancialEventsInWindow: (...args: unknown[]) => fetchWindow(...args),
}))

import { calendarMonthFinancialEventWindow } from "./date-window"
import { FINANCIAL_EVENT_LOAD_ATTEMPTS } from "./ensure-load"
import { resetFinancialEventLoadInflightForTests, useEnsureFinancialEvents } from "./use-ensure-financial-events"
import { useFinancialEventsStore } from "@/store/widgets/financial-events-store"

const month = calendarMonthFinancialEventWindow(new Date(2026, 2, 15), "America/New_York")
const otherMonth = calendarMonthFinancialEventWindow(new Date(2026, 5, 15), "America/New_York")

describe("useEnsureFinancialEvents retries", () => {
  beforeEach(() => {
    fetchWindow.mockReset()
    resetFinancialEventLoadInflightForTests()
    useFinancialEventsStore.setState({
      events: [],
      loadedRanges: [],
      initialized: true,
      isLoading: false,
      loadErrors: {},
    })
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("retries a rejected fetch with backoff until the attempt cap", async () => {
    fetchWindow.mockRejectedValue(new Error("db down"))

    renderHook(() => useEnsureFinancialEvents(month))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(fetchWindow).toHaveBeenCalledTimes(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(999)
    })
    expect(fetchWindow).toHaveBeenCalledTimes(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })
    expect(fetchWindow).toHaveBeenCalledTimes(2)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000)
    })
    expect(fetchWindow).toHaveBeenCalledTimes(FINANCIAL_EVENT_LOAD_ATTEMPTS)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000)
    })
    expect(fetchWindow).toHaveBeenCalledTimes(FINANCIAL_EVENT_LOAD_ATTEMPTS)
    expect(useFinancialEventsStore.getState().loadedRanges).toEqual([])
    const errors = Object.values(useFinancialEventsStore.getState().loadErrors)
    expect(errors).toHaveLength(1)
    expect(errors[0]?.attempts).toBe(FINANCIAL_EVENT_LOAD_ATTEMPTS)
  })

  it("still merges when loadedRanges changes mid-flight", async () => {
    let resolveFetch!: (events: unknown[]) => void
    fetchWindow.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve
        }),
    )
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

    renderHook(() => useEnsureFinancialEvents(month))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(fetchWindow).toHaveBeenCalledTimes(1)

    await act(async () => {
      useFinancialEventsStore.getState().setEvents([], { ...otherMonth, lang: "en" })
    })

    await act(async () => {
      resolveFetch([event])
      await Promise.resolve()
    })

    const after = useFinancialEventsStore.getState()
    expect(after.events).toEqual([event])
    expect(after.loadedRanges).toEqual(
      expect.arrayContaining([
        {
          startMs: month.start.getTime(),
          endMs: month.end.getTime(),
          lang: "en",
        },
        {
          startMs: otherMonth.start.getTime(),
          endMs: otherMonth.end.getTime(),
          lang: "en",
        },
      ]),
    )
  })
})
