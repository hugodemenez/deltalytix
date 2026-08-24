import { describe, expect, it } from "vitest";
import sitemap from "./sitemap";

describe("sitemap", () => {
  it("lists every public marketing page", () => {
    const paths = sitemap().map((entry) => new URL(entry.url).pathname);

    for (const expected of [
      "/",
      "/about",
      "/pricing",
      "/updates",
      "/support",
      "/propfirms",
      "/teams",
      "/terms",
      "/privacy",
      "/disclaimers",
    ]) {
      expect(paths, `${expected} is missing from the sitemap`).toContain(expected);
    }
  });

  it("lists the agent entry points", () => {
    const paths = sitemap().map((entry) => new URL(entry.url).pathname);

    expect(paths).toContain("/docs/api");
    expect(paths).toContain("/llms.txt");
  });

  it("uses absolute https URLs and no duplicates", () => {
    const urls = sitemap().map((entry) => entry.url);

    expect(new Set(urls).size).toBe(urls.length);
    for (const url of urls) {
      expect(url.startsWith("https://")).toBe(true);
    }
  });
});
