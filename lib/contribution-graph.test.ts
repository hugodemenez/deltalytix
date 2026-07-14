import { describe, expect, it } from "vitest";
import { buildWeeklyYearGraph } from "./contribution-graph";

describe("buildWeeklyYearGraph", () => {
  it("attaches GitHub line totals to the matching week", () => {
    const graph = buildWeeklyYearGraph(
      [{ date: "2026-07-13", authorName: "developer" }],
      2026,
      new Date("2026-07-15T12:00:00"),
      [
        {
          weekStart: "2026-07-12",
          additions: 420,
          deletions: 120,
        },
      ],
    );

    const week = graph.weekDetails.find(
      (detail) => detail.weekStart === "2026-07-12",
    );

    expect(week).toMatchObject({
      count: 1,
      additions: 420,
      deletions: 120,
    });
  });

  it("keeps unavailable line totals distinct from a zero-change week", () => {
    const graph = buildWeeklyYearGraph(
      [],
      2025,
      new Date("2026-07-15T12:00:00"),
    );

    expect(graph.weekDetails[0]).toMatchObject({
      additions: null,
      deletions: null,
    });
  });
});
