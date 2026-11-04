import { describe, expect, it } from "vitest"
import {
  journalMobileNewsRows,
  newsImportanceDotClass,
} from "./journal-mobile-news-rows"

describe("journalMobileNewsRows", () => {
  it("keeps empty 00:00 and 01:00 ticks and later event rows, without a day string", () => {
    const rows = journalMobileNewsRows([
      {
        id: "cpi",
        time: "14:30",
        title: "CPI US",
        importance: "MEDIUM",
      },
    ])

    expect(rows.map((row) => row.time)).toEqual(["00:00", "01:00", "14:30"])
    expect(rows[0]?.event).toBeUndefined()
    expect(rows[1]?.event).toBeUndefined()
    expect(rows[2]?.event?.title).toBe("CPI US")
    expect(JSON.stringify(rows)).not.toMatch(/nov|MMMM|yyyy|mer\./i)
  })

  it("does not duplicate a structural tick when an event already occupies that time", () => {
    const rows = journalMobileNewsRows([
      {
        id: "asia",
        time: "00:00",
        title: "Asia open",
        importance: "LOW",
      },
    ])

    expect(rows.map((row) => row.time)).toEqual(["00:00", "01:00"])
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
