import { describe, expect, it } from "vitest"
import {
  chartBarRadius,
  chartMaxBarSize,
  filterBarOpacity,
  honestPositiveDomain,
  honestSignedDomain,
  peakIndex,
  signedFill,
} from "./chart-glance"
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
