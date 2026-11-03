import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import picomatch from "next/dist/compiled/picomatch/index.js";
import {
  SUPPORT_SEARCH_TRACE_INCLUDES,
  SUPPORT_SEARCH_TRACE_NESTED_EXCLUDE_ROUTE,
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

  it("keeps the corpus include list pointed at source trees, not node_modules", () => {
    expect(SUPPORT_SEARCH_TRACE_INCLUDES.some((glob) => glob.startsWith("./app/"))).toBe(
      true,
    );
    expect(SUPPORT_SEARCH_TRACE_INCLUDES.some((glob) => glob.startsWith("./lib/"))).toBe(
      true,
    );
    expect(
      SUPPORT_SEARCH_TRACE_INCLUDES.every((glob) => !glob.includes("node_modules")),
    ).toBe(true);
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
