import { describe, expect, it } from "vitest"
import {
  chartBarRadius,
  chartMaxBarSize,
  filterBarOpacity,
  honestPositiveDomain,
  honestSignedDomain,
  normalizeBarRect,
  peakIndex,
  signedFill,
} from "./chart-glance"
import { expandUnitDots, shouldPackUnitField } from "./chart-unit-field"
import { canDrawUnitHistogram } from "./chart-unit-histogram"
import {
  countPeakConclusion,
  dailyPnlConclusion,
  namedSignedConclusion,
  shareConclusion,
} from "./chart-conclusions"

describe("chartBarRadius", () => {
  it("rounds the outer end of a positive bar", () => {
    expect(chartBarRadius(12)).toEqual([8, 8, 0, 0])
  })

  it("rounds the outer end of a negative bar", () => {
    expect(chartBarRadius(-4)).toEqual([0, 0, 8, 8])
  })

  it("rounds the outer end of a horizontal negative bar", () => {
    expect(chartBarRadius(-4, "horizontal")).toEqual([8, 0, 0, 8])
  })

  it("rounds the outer end of a horizontal positive bar", () => {
    expect(chartBarRadius(12, "horizontal")).toEqual([0, 8, 8, 0])
  })
})

describe("normalizeBarRect", () => {
  it("keeps a positive-height rect in place", () => {
    expect(normalizeBarRect(10, 20, 8, 40)).toEqual({
      x: 10,
      y: 20,
      width: 8,
      height: 40,
    })
  })

  it("flips a negative-height rect so y is the visual top", () => {
    expect(normalizeBarRect(10, 80, 8, -40)).toEqual({
      x: 10,
      y: 40,
      width: 8,
      height: 40,
    })
  })

  it("flips a negative-width rect so x is the visual left", () => {
    expect(normalizeBarRect(80, 20, -40, 8)).toEqual({
      x: 40,
      y: 20,
      width: 40,
      height: 8,
    })
  })
})

describe("expandUnitDots", () => {
  it("emits one dot per record", () => {
    expect(
      expandUnitDots(
        [
          { key: "win", label: "Win", color: "green", count: 2 },
          { key: "loss", label: "Loss", color: "red", count: 1 },
        ],
        "record",
      ),
    ).toHaveLength(3)
  })

  it("packs percent mode to 100 dots", () => {
    const dots = expandUnitDots(
      [
        { key: "win", label: "Win", color: "green", count: 3 },
        { key: "loss", label: "Loss", color: "red", count: 1 },
      ],
      "percent",
    )
    expect(dots).toHaveLength(100)
    expect(dots.filter((dot) => dot.key.startsWith("win-"))).toHaveLength(75)
    expect(dots.filter((dot) => dot.key.startsWith("loss-"))).toHaveLength(25)
  })
})

describe("shouldPackUnitField", () => {
  it("packs only dense trade counts", () => {
    expect(shouldPackUnitField(120)).toBe(false)
    expect(shouldPackUnitField(121)).toBe(true)
  })
})

describe("canDrawUnitHistogram", () => {
  it("rejects a histogram that would crush the dots", () => {
    expect(canDrawUnitHistogram([2, 4, 3])).toBe(true)
    expect(canDrawUnitHistogram(Array.from({ length: 20 }, () => 2))).toBe(false)
    expect(canDrawUnitHistogram([80])).toBe(false)
  })
})

describe("honestSignedDomain", () => {
  it("keeps zero on the axis", () => {
    expect(honestSignedDomain([40, -10])).toEqual([-14, 44])
  })

  it("does not start a positive series above zero", () => {
    const [, max] = honestSignedDomain([10, 20])
    expect(honestSignedDomain([10, 20])[0]).toBe(0)
    expect(max).toBeGreaterThan(20)
  })
})

describe("honestPositiveDomain", () => {
  it("starts at zero", () => {
    expect(honestPositiveDomain([4, 8])[0]).toBe(0)
  })
})

describe("signedFill", () => {
  it("maps sign to win/loss tokens", () => {
    expect(signedFill(1)).toContain("chart-win")
    expect(signedFill(-1)).toContain("chart-loss")
  })
})

describe("filterBarOpacity", () => {
  it("dims inactive bars only when a filter is on", () => {
    expect(filterBarOpacity(false, false)).toBe(1)
    expect(filterBarOpacity(false, true)).toBe(0.35)
    expect(filterBarOpacity(true, true)).toBe(1)
  })
})

describe("chartMaxBarSize", () => {
  it("uses chunkier Glance bars on medium widgets", () => {
    expect(chartMaxBarSize("medium")).toBeGreaterThan(chartMaxBarSize("small"))
  })
})

describe("dailyPnlConclusion", () => {
  it("reports the majority color", () => {
    expect(dailyPnlConclusion([10, 4, -2])).toEqual({
      kind: "greenDays",
      green: 2,
      total: 3,
    })
    expect(dailyPnlConclusion([-3, -1, 2])).toEqual({
      kind: "redDays",
      red: 2,
      total: 3,
    })
  })
})

describe("namedSignedConclusion", () => {
  it("picks the larger absolute swing", () => {
    expect(
      namedSignedConclusion([
        { label: "Mon", value: 20 },
        { label: "Wed", value: -80 },
      ]),
    ).toEqual({ kind: "worst", label: "Wed" })
  })
})

describe("countPeakConclusion", () => {
  it("names the busiest bucket", () => {
    expect(
      countPeakConclusion([
        { label: "2", count: 1 },
        { label: "4", count: 9 },
      ]),
    ).toEqual({ kind: "peak", label: "4" })
  })
})

describe("shareConclusion", () => {
  it("rounds the part of the whole", () => {
    expect(shareConclusion(18, 100)).toEqual({ kind: "share", percent: 18 })
  })
})

describe("peakIndex", () => {
  it("returns -1 for an empty list", () => {
    expect(peakIndex([], (value: number) => value)).toBe(-1)
  })
})
