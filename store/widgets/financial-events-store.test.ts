import { beforeEach, describe, expect, it } from "vitest"
import type { FinancialEvent } from "@/prisma/generated/prisma/browser"
import { mergeFinancialEvents, useFinancialEventsStore } from "./financial-events-store"

function event(overrides: Partial<FinancialEvent>): FinancialEvent {
  return {
    id: "id-1",
    title: "CPI",
    date: new Date("2026-03-13T13:30:00.000Z"),
    importance: "high",
    type: "indicator",
    description: null,
    createdAt: new Date("2026-03-01T00:00:00.000Z"),
    updatedAt: new Date("2026-03-01T00:00:00.000Z"),
    sourceUrl: null,
    country: "US",
    lang: "en",
    timezone: "UTC",
    ...overrides,
  }
}

const march = {
  start: new Date("2026-03-01T05:00:00.000Z"),
  end: new Date("2026-04-01T03:59:59.999Z"),
  lang: "en",
}

describe("financial events store", () => {
  beforeEach(() => {
    useFinancialEventsStore.setState({
      events: [],
      loadedRanges: [],
      initialized: false,
      isLoading: false,
      loadErrors: {},
    })
  })

  it("collapses the same news after the cron assigns a new id", () => {
    const original = event({ id: "before-cron" })
    const rewritten = event({ id: "after-cron" })
    expect(mergeFinancialEvents([original], [rewritten])).toEqual([rewritten])

    useFinancialEventsStore.getState().setEvents([original], march)
    useFinancialEventsStore.getState().mergeEvents([rewritten], march)
    expect(useFinancialEventsStore.getState().events).toEqual([rewritten])
  })

  it("keeps a month fetched outside the refreshed bootstrap window", () => {
    const marchEvent = event({ id: "march" })
    const june = {
      start: new Date("2026-06-01T04:00:00.000Z"),
      end: new Date("2026-07-01T03:59:59.999Z"),
      lang: "en",
    }
    const juneEvent = event({
      id: "june",
      title: "NFP",
      date: new Date("2026-06-05T12:30:00.000Z"),
    })
    const store = useFinancialEventsStore.getState()
    store.setEvents([marchEvent], march)
    store.mergeEvents([juneEvent], june)

    useFinancialEventsStore.getState().setEvents([event({ id: "march-refresh" })], march)

    const after = useFinancialEventsStore.getState()
    expect(after.events.map((item) => item.id).sort()).toEqual(["june", "march-refresh"])
    expect(after.loadedRanges).toEqual([
      { startMs: march.start.getTime(), endMs: march.end.getTime(), lang: "en" },
      { startMs: june.start.getTime(), endMs: june.end.getTime(), lang: "en" },
    ])
  })

  it("records a failed window without treating it as loaded", () => {
    const store = useFinancialEventsStore.getState()
    store.setEvents([], march)
    store.noteLoadFailure("en:1:2", {
      start: new Date(1),
      end: new Date(2),
      lang: "en",
    }, "db down")

    const after = useFinancialEventsStore.getState()
    expect(after.loadedRanges).toHaveLength(1)
    expect(after.loadErrors["en:1:2"]).toMatchObject({ attempts: 1, message: "db down" })
    after.noteLoadFailure("en:1:2", {
      start: new Date(1),
      end: new Date(2),
      lang: "en",
    }, "db down")
    expect(useFinancialEventsStore.getState().loadErrors["en:1:2"]?.attempts).toBe(2)
  })

  it("keeps an adjacent month when setEvents refreshes the bootstrap window", () => {
    const february = {
      start: new Date("2026-02-01T05:00:00.000Z"),
      end: new Date("2026-03-01T04:59:59.999Z"),
      lang: "en",
    }
    const februaryEvent = event({
      id: "feb",
      title: "Jobs",
      date: new Date("2026-02-10T13:30:00.000Z"),
    })
    const store = useFinancialEventsStore.getState()
    store.setEvents([februaryEvent], february)
    store.setEvents([event({ id: "march-bootstrap" })], march)

    const after = useFinancialEventsStore.getState()
    expect(after.events.map((item) => item.id).sort()).toEqual(["feb", "march-bootstrap"])
    expect(after.loadedRanges).toEqual([
      { startMs: march.start.getTime(), endMs: march.end.getTime(), lang: "en" },
      { startMs: february.start.getTime(), endMs: february.end.getTime(), lang: "en" },
    ])
  })

  it("clears a covered loadError when mergeEvents loads the wider window", () => {
    const day = {
      start: new Date("2026-03-13T00:00:00.000Z"),
      end: new Date("2026-03-13T23:59:59.999Z"),
      lang: "en",
    }
    const key = `en:${day.start.getTime()}:${day.end.getTime()}`
    const store = useFinancialEventsStore.getState()
    store.setEvents([], {
      start: new Date("2026-01-01T00:00:00.000Z"),
      end: new Date("2026-01-31T23:59:59.999Z"),
      lang: "en",
    })
    store.noteLoadFailure(key, day, "db down")
    store.noteLoadFailure(key, day, "db down")
    store.noteLoadFailure(key, day, "db down")
    expect(useFinancialEventsStore.getState().loadErrors[key]?.attempts).toBe(3)

    useFinancialEventsStore.getState().mergeEvents([event({ id: "march" })], march)

    expect(useFinancialEventsStore.getState().loadErrors[key]).toBeUndefined()
    expect(useFinancialEventsStore.getState().events.map((item) => item.id)).toEqual(["march"])
  })
})
