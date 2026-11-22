// @vitest-environment happy-dom
import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/locales/client", () => ({
  useI18n: () => (key: string) => key,
}))

import { calendarMonthFinancialEventWindow } from "./date-window"
import { financialEventLoadKey } from "./ensure-load"
import { FinancialEventLoadRetry } from "./financial-event-load-retry"
import { useFinancialEventsStore } from "@/store/widgets/financial-events-store"

const month = calendarMonthFinancialEventWindow(new Date(2026, 2, 15), "America/New_York")
const key = financialEventLoadKey("en", month.start.getTime(), month.end.getTime())

describe("FinancialEventLoadRetry", () => {
  beforeEach(() => {
    useFinancialEventsStore.setState({
      events: [],
      loadedRanges: [],
      initialized: true,
      isLoading: false,
      loadErrors: {},
    })
  })

  it("stays hidden until the automatic retries are exhausted, then resets them", () => {
    const { rerender } = render(<FinancialEventLoadRetry window={month} lang="en" />)
    expect(screen.queryByRole("button")).toBeNull()

    useFinancialEventsStore.setState({
      loadErrors: {
        [key]: {
          attempts: 3,
          message: "db down",
          startMs: month.start.getTime(),
          endMs: month.end.getTime(),
          lang: "en",
        },
      },
    })
    rerender(<FinancialEventLoadRetry window={month} lang="en" />)

    fireEvent.click(screen.getByRole("button", { name: "calendar.newsLoadRetry" }))
    expect(useFinancialEventsStore.getState().loadErrors[key]?.attempts).toBe(0)
  })
})