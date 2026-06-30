import { describe, expect, it } from "vitest"

import {
  allowsVerticalScroll,
  canScrollInDirection,
  getCarouselGestureDecision,
} from "./use-carousel-gesture-lock"

describe("canScrollInDirection", () => {
  it("allows scrolling down before the bottom edge", () => {
    expect(
      canScrollInDirection(
        { scrollTop: 10, scrollHeight: 200, clientHeight: 100 },
        12
      )
    ).toBe(true)
  })

  it("allows scrolling up after the top edge", () => {
    expect(
      canScrollInDirection(
        { scrollTop: 10, scrollHeight: 200, clientHeight: 100 },
        -12
      )
    ).toBe(true)
  })

  it("rejects scrolling past either edge", () => {
    expect(
      canScrollInDirection(
        { scrollTop: 0, scrollHeight: 200, clientHeight: 100 },
        -12
      )
    ).toBe(false)
    expect(
      canScrollInDirection(
        { scrollTop: 100, scrollHeight: 200, clientHeight: 100 },
        12
      )
    ).toBe(false)
  })
})

describe("allowsVerticalScroll", () => {
  it("accepts scrollable overflow modes", () => {
    expect(allowsVerticalScroll("auto")).toBe(true)
    expect(allowsVerticalScroll("scroll")).toBe(true)
    expect(allowsVerticalScroll("overlay")).toBe(true)
  })

  it("rejects non-scrollable overflow modes", () => {
    expect(allowsVerticalScroll("visible")).toBe(false)
    expect(allowsVerticalScroll("hidden")).toBe(false)
    expect(allowsVerticalScroll("clip")).toBe(false)
  })
})

describe("getCarouselGestureDecision", () => {
  it("keeps vertical movement inside a scrollable descendant native", () => {
    expect(
      getCarouselGestureDecision({
        absDx: 4,
        absDy: 24,
        fromChart: false,
        fromInteractive: true,
        nativeScrollableCanScroll: true,
      })
    ).toEqual({ mode: "native-scroll", preventDefault: false })
  })

  it("lets nested horizontal carousel gestures reach their own handlers", () => {
    expect(
      getCarouselGestureDecision({
        absDx: 24,
        absDy: 4,
        fromChart: false,
        fromInteractive: true,
        nativeScrollableCanScroll: false,
      })
    ).toEqual({ mode: "interactive", preventDefault: false })
  })

  it("preserves chart horizontal scrub locking", () => {
    expect(
      getCarouselGestureDecision({
        absDx: 32,
        absDy: 8,
        fromChart: true,
        fromInteractive: true,
        nativeScrollableCanScroll: false,
      })
    ).toEqual({ mode: "chart-scrub", preventDefault: true })
  })

  it("favors carousel swipes for chart vertical movement", () => {
    expect(
      getCarouselGestureDecision({
        absDx: 8,
        absDy: 32,
        fromChart: true,
        fromInteractive: true,
        nativeScrollableCanScroll: false,
      })
    ).toEqual({ mode: "carousel", preventDefault: false })
  })
})
