import { afterEach, describe, expect, it } from "vitest";
import { clearCorpusCache } from "./codebase-index";
import {
  grepCodebase,
  listCodebaseFiles,
  readCodebaseFile,
  searchCodebase,
} from "./search-codebase";

afterEach(() => {
  clearCorpusCache();
});

describe("searchCodebase source-first ranking", () => {
  it("ranks implementation ahead of changelog for product behaviour queries", async () => {
    const result = await searchCodebase("tradovate oauth connect");

    expect(result.matchCount).toBeGreaterThan(0);
    expect(result.matches[0]?.kind).toBe("source");
    expect(result.matches[0]?.file).toMatch(/tradovate/i);
  });

  it("can restrict results to the source corpus clone", async () => {
    const result = await searchCodebase("dashboard calendar trades", {
      scope: "source",
    });

    expect(result.scope).toBe("source");
    expect(result.matchCount).toBeGreaterThan(0);
    expect(
      result.matches.every((match) => match.kind === "source" || match.kind === "schema"),
    ).toBe(true);
  });
});

describe("grepCodebase over source", () => {
  it("finds symbols in lib/ with scope=source", async () => {
    const result = await grepCodebase("ibkr-flex", {
      scope: "source",
      glob: "lib/**/*.ts",
    });

    expect(result.error).toBeUndefined();
    expect(result.matchCount).toBeGreaterThan(0);
    expect(result.matches.every((match) => match.file.startsWith("lib/"))).toBe(true);
  });

  it("rejects invalid regular expressions", async () => {
    const result = await grepCodebase("(", { scope: "source" });

    expect(result.matchCount).toBe(0);
    expect(result.error).toMatch(/Invalid regular expression/i);
  });
});

describe("read and list helpers", () => {
  it("reads a known source file from the corpus clone", async () => {
    const listed = await listCodebaseFiles("lib/ibkr-flex-client.ts", {
      scope: "source",
    });
    expect(listed.files).toContain("lib/ibkr-flex-client.ts");

    const file = await readCodebaseFile("lib/ibkr-flex-client.ts", {
      startLine: 1,
      endLine: 20,
    });

    expect(file.error).toBeUndefined();
    expect(file.content).toContain("1:");
    expect(file.totalLines).toBeGreaterThan(20);
  });
});
