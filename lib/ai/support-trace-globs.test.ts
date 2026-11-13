import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import picomatch from "next/dist/compiled/picomatch/index.js";
import {
  MIN_SUPPORT_CORPUS_FILES,
  SUPPORT_CORPUS_SNAPSHOT,
  SUPPORT_SEARCH_TRACE_INCLUDES,
  SUPPORT_SEARCH_TRACE_NESTED_EXCLUDE_ROUTE,
  collectCorpusSources,
  compareCorpusPaths,
  indexCorpusSource,
  parseCorpusSnapshot,
} from "./codebase-index";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

/** Same options Next.js uses in `collect-build-traces` for include/exclude keys. */
function routeGlob(pattern: string) {
  return picomatch(pattern, { dot: true, contains: true });
}

describe("support corpus tracing globs", () => {
  it("documents that Next.js include keys substring-match nested routes", () => {
    const include = routeGlob("/api/ai/support");
    expect(include("/api/ai/support")).toBe(true);
    expect(include("/api/ai/support/translate-label")).toBe(true);
    expect(include("/api/journal-docx")).toBe(false);
  });

  it("excludes nested support routes without stripping the parent chat route", () => {
    const exclude = routeGlob(SUPPORT_SEARCH_TRACE_NESTED_EXCLUDE_ROUTE);
    expect(SUPPORT_SEARCH_TRACE_NESTED_EXCLUDE_ROUTE).toBe("/api/ai/support/*");
    expect(exclude("/api/ai/support")).toBe(false);
    expect(exclude("/api/ai/support/translate-label")).toBe(true);
    expect(exclude("/api/journal-docx")).toBe(false);
  });

  it("traces only the JSON snapshot, not application source trees", () => {
    expect(SUPPORT_SEARCH_TRACE_INCLUDES).toEqual([`./${SUPPORT_CORPUS_SNAPSHOT}`]);
    expect(
      SUPPORT_SEARCH_TRACE_INCLUDES.some((glob) => glob.includes("**")),
    ).toBe(false);
    expect(
      SUPPORT_SEARCH_TRACE_INCLUDES.every((glob) => !glob.includes("node_modules")),
    ).toBe(true);
  });

  it("hydrates snapshot records the same way disk files are indexed", () => {
    const indexed = indexCorpusSource({
      path: "lib/example.ts",
      kind: "source",
      content: "# Title\nexport const name = \"Tradovate\";\n",
    });
    expect(indexed.path).toBe("lib/example.ts");
    expect(indexed.kind).toBe("source");
    expect(indexed.lines[1]).toBe('export const name = "Tradovate";');
    expect(indexed.lowerContent).toContain("tradovate");

    const hydrated = parseCorpusSnapshot(
      JSON.stringify([
        { path: "README.md", kind: "doc", content: "# Deltalytix\n" },
      ]),
    );
    expect(hydrated).toHaveLength(1);
    expect(hydrated[0]?.title).toBe("Deltalytix");
  });

  it("round-trips the live corpus through the snapshot JSON", async () => {
    const sources = await collectCorpusSources(repoRoot);
    expect(sources.length).toBeGreaterThanOrEqual(MIN_SUPPORT_CORPUS_FILES);
    const paths = sources.map((file) => file.path);
    const sorted = [...paths].sort((left, right) => compareCorpusPaths(left, right));
    expect(paths).toEqual(sorted);
    const direct = sources.map(indexCorpusSource);
    const viaJson = parseCorpusSnapshot(JSON.stringify(sources));
    expect(viaJson.map((file) => file.path)).toEqual(direct.map((file) => file.path));
    const sample = viaJson.find((file) => file.path === "lib/ai/codebase-index.ts");
    expect(sample?.content).toContain("SUPPORT_CORPUS_SNAPSHOT");
    expect(sample?.lines).toEqual(direct.find((file) => file.path === sample?.path)?.lines);
  });

  it("wires the nested exclude and external packages in next.config.ts", () => {
    const config = readFileSync(join(repoRoot, "next.config.ts"), "utf8");
    expect(config).toContain("SUPPORT_SEARCH_TRACE_NESTED_EXCLUDE_ROUTE");
    expect(config).toContain("outputFileTracingExcludes");
    expect(config).toMatch(/serverExternalPackages:\s*\[[\s\S]*'docx'/);
    expect(config).toMatch(/serverExternalPackages:\s*\[[\s\S]*'sharp'/);
    expect(config).toContain("node_modules/docx/**");
    expect(config).toContain("sharp-libvips-linuxmusl");
  });
});
