import { describe, expect, it } from "vitest";
import {
  DELTALYTIX_HUB_ROW,
  compareJournalSort,
  filterJournalsByName,
} from "./compare-shared";
import {
  getAllCompareMetadata,
  getCompareJournal,
  getCompareJournalMetadata,
  getHubJournalRows,
  getLiveCompareMetadata,
  resolveCompareLocale,
} from "./compare";

describe("compare catalog", () => {
  it("lists EN journals from MDX without a hardcoded table", async () => {
    const journals = await getAllCompareMetadata("en");

    expect(journals.map((journal) => journal.slug)).toEqual([
      "trademetria",
      "tradezella",
      "tradervue",
    ]);
    expect(journals.map((journal) => journal.status)).toEqual([
      "live",
      "live",
      "live",
    ]);
  });

  it("falls back to EN when the locale folder is empty", async () => {
    expect(resolveCompareLocale("de")).toBe("en");

    const journals = await getAllCompareMetadata("de");
    expect(journals.some((journal) => journal.slug === "trademetria")).toBe(
      true,
    );
  });

  it("resolves FR MDX and Dumas hub copy", async () => {
    expect(resolveCompareLocale("fr")).toBe("fr");

    const trademetria = await getCompareJournalMetadata("trademetria", "fr");
    expect(trademetria?.oneLiner).toBe(
      "Journal multi-marchés — actions, options, futures, et plus.",
    );

    const tradezella = await getCompareJournalMetadata("tradezella", "fr");
    expect(tradezella?.oneLiner).toBe(
      "Journal multi-marchés, plus replay, backtesting et IA.",
    );

    const tradervue = await getCompareJournalMetadata("tradervue", "fr");
    expect(tradervue?.oneLiner).toBe(
      "Journal multi-marchés avec plus de 80 importateurs de plateformes.",
    );

    const rows = await getHubJournalRows("fr");
    expect(rows[0].oneLiner).toBe(
      "Importez vos futures. Lisez le P&L dans un seul journal.",
    );

    expect(await getCompareJournal("trademetria", "fr")).not.toBeNull();
    expect(await getCompareJournal("tradezella", "fr")).not.toBeNull();
    expect(await getCompareJournal("tradervue", "fr")).not.toBeNull();
  });

  it("exposes live journals for 1:1 params from the MDX folder", async () => {
    const live = await getLiveCompareMetadata("en");
    expect(live.map((journal) => journal.slug)).toEqual([
      "trademetria",
      "tradezella",
      "tradervue",
    ]);
  });

  it("puts Deltalytix first on the hub and keeps it out of compare files", async () => {
    const rows = await getHubJournalRows("en");
    expect(rows[0]).toEqual(DELTALYTIX_HUB_ROW);
    expect(
      rows.some(
        (row) => row.slug === "deltalytix" && row.status === "us",
      ),
    ).toBe(true);
    expect(rows.every((row) => row.status === "us" || row.status === "live")).toBe(
      true,
    );
    expect(rows.map((row) => row.slug)).toEqual([
      "deltalytix",
      "trademetria",
      "tradezella",
      "tradervue",
    ]);

    const files = await getAllCompareMetadata("en");
    expect(files.some((journal) => journal.slug === "deltalytix")).toBe(false);
  });

  it("reads locked hub copy from live frontmatter", async () => {
    const trademetria = await getCompareJournalMetadata("trademetria", "en");
    expect(trademetria).toMatchObject({
      name: "Trademetria",
      status: "live",
      oneLiner:
        "Multi-market journal — stocks, options, futures, and more.",
    });

    const tradezella = await getCompareJournalMetadata("tradezella", "en");
    expect(tradezella).toMatchObject({
      name: "TradeZella",
      status: "live",
      oneLiner:
        "Multi-market journal plus replay, backtesting, and AI.",
    });

    const tradervue = await getCompareJournalMetadata("tradervue", "en");
    expect(tradervue).toMatchObject({
      name: "Tradervue",
      status: "live",
      oneLiner:
        "Multi-market journal with 80+ platform importers.",
    });
  });

  it("compiles a 1:1 for every live journal", async () => {
    expect(await getCompareJournal("trademetria", "en")).not.toBeNull();
    expect(await getCompareJournal("tradezella", "en")).not.toBeNull();
    expect(await getCompareJournal("tradervue", "en")).not.toBeNull();
  });
});

describe("filterJournalsByName", () => {
  const rows = [
    { name: "Deltalytix" },
    { name: "Trademetria" },
    { name: "TradeZella" },
    { name: "Tradervue" },
  ];

  it("filters on the journal name, case-insensitive", () => {
    expect(filterJournalsByName(rows, "trade").map((row) => row.name)).toEqual([
      "Trademetria",
      "TradeZella",
      "Tradervue",
    ]);
    expect(filterJournalsByName(rows, "DELTA")).toEqual([{ name: "Deltalytix" }]);
  });

  it("returns every row when the query is blank", () => {
    expect(filterJournalsByName(rows, "   ")).toEqual(rows);
  });
});

describe("compareJournalSort", () => {
  it("orders by optional order, then name", () => {
    const sorted = [
      { name: "Zulu", order: 2 },
      { name: "Beta", order: Number.POSITIVE_INFINITY },
      { name: "Alpha", order: Number.POSITIVE_INFINITY },
      { name: "First", order: 1 },
    ].sort(compareJournalSort);

    expect(sorted.map((row) => row.name)).toEqual([
      "First",
      "Zulu",
      "Alpha",
      "Beta",
    ]);
  });
});
