import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relative: string) =>
  fs.readFileSync(path.join(root, relative), "utf8");

/**
 * Unmatched paths used to be caught by `app/[locale]/[...not-found]/page.tsx`.
 * With Cache Components that route still has a prerendered shell, so the shell
 * was flushed with HTTP 200 before `notFound()` ran - a soft 404 that told
 * agents every path exists. `global-not-found` is resolved by the router before
 * any shell exists, so the status is a real 404.
 */
describe("404 handling", () => {
  it("enables globalNotFound", () => {
    expect(read("next.config.ts")).toMatch(/globalNotFound:\s*true/);
  });

  it("declares Vary: Accept for the content-negotiated homepage", () => {
    // Next.js replaces the `Vary` the proxy sets on App Router pages with its
    // own RSC value, so the HTML representation gets it from the config, which
    // is applied by the routing layer afterwards. The markdown representation
    // is returned by the proxy itself and carries the header directly.
    const config = read("next.config.ts");

    expect(config).toContain('source: "/"');
    expect(config).toMatch(/source: `\/:locale\(\$\{LOCALES\.join\("\|"\)\}\)`/);
    expect(config).toMatch(/key: "Vary", value: "Accept"/);
  });

  it("has no catch-all route that would intercept unmatched paths first", () => {
    expect(fs.existsSync(path.join(root, "app/[locale]/[...not-found]"))).toBe(
      false,
    );
  });

  it("returns a complete HTML document, since global-not-found bypasses the root layout", () => {
    const source = read("app/global-not-found.tsx");

    expect(source).toContain("<html");
    expect(source).toContain("<body");
    expect(source).toContain('import "./globals.css"');
    expect(source).toContain("export const metadata");
  });

  it("points agents at the machine-readable entry points", () => {
    const source = read("app/global-not-found.tsx");

    expect(source).toContain("AgentNotFoundResources");
    expect(source).toContain('href="/llms.txt"');
    expect(source).toContain('href="/sitemap.xml"');
  });

  it("keeps the existing 404 UI for notFound() inside a route segment", () => {
    expect(read("app/not-found.tsx")).toContain("NotFoundContent");
    expect(read("components/not-found-content.tsx")).toContain(
      "export function NotFoundContent",
    );
  });
});
