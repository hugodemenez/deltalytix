import { describe, expect, it } from "vitest"
import {
  addTagToList,
  applyTagOperation,
  intersectionTagLists,
  mergeTagsOnTrades,
  normalizeTagName,
  removeTagFromList,
  unionTagLists,
  uniqueTradeIds,
} from "./tag-merge"

describe("normalizeTagName", () => {
  it("trims whitespace", () => {
    expect(normalizeTagName("  scalp  ")).toBe("scalp")
  })
})

describe("uniqueTradeIds", () => {
  it("drops empty ids and duplicates while keeping order", () => {
    expect(uniqueTradeIds(["a", "", "b", "a", "c"])).toEqual(["a", "b", "c"])
  })
})

describe("addTagToList", () => {
  it("appends a new tag without mutating the source", () => {
    const tags = ["scalp", "news"]
    expect(addTagToList(tags, "setup")).toEqual(["scalp", "news", "setup"])
    expect(tags).toEqual(["scalp", "news"])
  })

  it("does not add a duplicate", () => {
    expect(addTagToList(["scalp"], "scalp")).toEqual(["scalp"])
  })

  it("ignores blank tags", () => {
    expect(addTagToList(["scalp"], "   ")).toEqual(["scalp"])
  })
})

describe("removeTagFromList", () => {
  it("removes only the matching tag", () => {
    expect(removeTagFromList(["scalp", "news", "fomo"], "news")).toEqual([
      "scalp",
      "fomo",
    ])
  })

  it("leaves other tags in place when the tag is absent", () => {
    expect(removeTagFromList(["scalp"], "news")).toEqual(["scalp"])
  })
})

describe("unionTagLists", () => {
  it("shows the union of grouped sub-trade tags without duplicates", () => {
    expect(
      unionTagLists([
        ["scalp", "news"],
        ["fomo", "news"],
        ["setup"],
      ]),
    ).toEqual(["scalp", "news", "fomo", "setup"])
  })
})

describe("intersectionTagLists", () => {
  it("returns tags present on every list", () => {
    expect(
      intersectionTagLists([
        ["scalp", "news"],
        ["news", "fomo"],
        ["news"],
      ]),
    ).toEqual(["news"])
  })

  it("returns an empty list when nothing is shared", () => {
    expect(intersectionTagLists([["scalp"], ["fomo"]])).toEqual([])
  })
})

describe("mergeTagsOnTrades", () => {
  const grouped = [
    { id: "a", tags: ["scalp", "news"] },
    { id: "b", tags: ["fomo"] },
    { id: "c", tags: ["scalp"] },
  ]

  it("adds a tag to every selected trade without overwriting existing tags", () => {
    expect(mergeTagsOnTrades(grouped, ["a", "b"], "setup", "add")).toEqual([
      { id: "a", tags: ["scalp", "news", "setup"] },
      { id: "b", tags: ["fomo", "setup"] },
      { id: "c", tags: ["scalp"] },
    ])
  })

  it("does not replace grouped sub-trades with the first trade's tags", () => {
    const overwrittenTheOldWay = grouped.map((trade) =>
      ["a", "b"].includes(trade.id)
        ? { ...trade, tags: [...grouped[0].tags, "setup"] }
        : trade,
    )

    const merged = mergeTagsOnTrades(grouped, ["a", "b"], "setup", "add")

    expect(overwrittenTheOldWay[1].tags).toEqual(["scalp", "news", "setup"])
    expect(merged[1].tags).toEqual(["fomo", "setup"])
    expect(merged[1].tags).not.toContain("news")
    expect(merged[0].tags).toEqual(["scalp", "news", "setup"])
  })

  it("removes only that tag from each selected trade", () => {
    expect(mergeTagsOnTrades(grouped, ["a", "c"], "scalp", "remove")).toEqual([
      { id: "a", tags: ["news"] },
      { id: "b", tags: ["fomo"] },
      { id: "c", tags: [] },
    ])
  })

  it("is a no-op for unselected trades and duplicate ids", () => {
    const once = mergeTagsOnTrades(grouped, ["a", "a", ""], "news", "remove")
    expect(once[0].tags).toEqual(["scalp"])
    expect(once[1]).toEqual(grouped[1])
    expect(once[2]).toEqual(grouped[2])
  })

  it("applyTagOperation matches add and remove helpers", () => {
    expect(applyTagOperation(["a"], "b", "add")).toEqual(["a", "b"])
    expect(applyTagOperation(["a", "b"], "a", "remove")).toEqual(["b"])
  })
})
