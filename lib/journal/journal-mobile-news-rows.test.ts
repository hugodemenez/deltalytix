import { describe, expect, it } from "vitest"
import {
  journalMobileHourTicks,
  journalMobileNewsRows,
  newsImportanceDotClass,
} from "./journal-mobile-news-rows"

describe("journalMobileNewsRows", () => {
  it("renders 00:00 through 18:00 ticks plus off-hour events, without a day string", () => {
    const rows = journalMobileNewsRows([
      {
        id: "cpi",
        time: "14:30",
        title: "CPI US",
        importance: "MEDIUM",
      },
      {
        id: "ism",
        time: "16:00",
        title: "ISM",
        importance: "HIGH",
      },
    ])

    expect(journalMobileHourTicks()).toEqual([
      "00:00",
      "01:00",
      "02:00",
      "03:00",
      "04:00",
      "05:00",
      "06:00",
      "07:00",
      "08:00",
      "09:00",
      "10:00",
      "11:00",
      "12:00",
      "13:00",
      "14:00",
      "15:00",
      "16:00",
      "17:00",
      "18:00",
    ])
    expect(rows.map((row) => row.time).slice(0, 8)).toEqual([
      "00:00",
      "01:00",
      "02:00",
      "03:00",
      "04:00",
      "05:00",
      "06:00",
      "07:00",
    ])
    expect(rows.find((row) => row.time === "14:30")?.event?.title).toBe("CPI US")
    expect(rows.find((row) => row.time === "16:00")?.event?.title).toBe("ISM")
    expect(rows.some((row) => row.key === "tick-16:00")).toBe(false)
    expect(rows.at(-1)?.time).toBe("18:00")
    expect(JSON.stringify(rows)).not.toMatch(/nov|MMMM|yyyy|mer\./i)
  })

  it("does not duplicate a tick when an event already occupies that hour", () => {
    const rows = journalMobileNewsRows([
      {
        id: "asia",
        time: "00:00",
        title: "Asia open",
        importance: "LOW",
      },
    ])

    expect(rows.filter((row) => row.time === "00:00")).toHaveLength(1)
    expect(rows[0]?.event?.title).toBe("Asia open")
  })
})

describe("newsImportanceDotClass", () => {
  it("maps medium impact to the orange tick used in the compact list", () => {
    expect(newsImportanceDotClass("MEDIUM")).toBe("bg-orange-400")
    expect(newsImportanceDotClass("HIGH")).toBe("bg-red-500")
    expect(newsImportanceDotClass("LOW")).toBe("bg-blue-400")
  })
})
