import { describe, expect, it } from "vitest";
import sitemap from "./sitemap";
import { INDEXABLE_LOCALES } from "@/lib/seo-urls";

describe("sitemap", () => {
  it("lists every public marketing page with locale prefixes", async () => {
    const paths = (await sitemap()).map((entry) => new URL(entry.url).pathname);

    for (const locale of INDEXABLE_LOCALES) {
      for (const expected of [
        `/${locale}`,
        `/${locale}/about`,
        `/${locale}/pricing`,
        `/${locale}/updates`,
        `/${locale}/support`,
        `/${locale}/propfirms`,
        `/${locale}/teams`,
        `/${locale}/terms`,
        `/${locale}/privacy`,
        `/${locale}/disclaimers`,
        `/${locale}/trading-journal/futures`,
      ]) {
        expect(paths, `${expected} is missing from the sitemap`).toContain(expected);
      }
    }
  });

  it("lists the agent entry points without a locale prefix", async () => {
    const paths = (await sitemap()).map((entry) => new URL(entry.url).pathname);

    expect(paths).toContain("/docs/api");
    expect(paths).toContain("/llms.txt");
  });

  it("does not list robots-disallowed or private routes", async () => {
    const paths = (await sitemap()).map((entry) => new URL(entry.url).pathname);

    for (const excluded of [
      "/authentication",
      "/en/authentication",
      "/fr/authentication",
      "/settings",
      "/en/settings",
      "/dashboard",
      "/en/dashboard",
    ]) {
      expect(paths, `${excluded} must not be in the sitemap`).not.toContain(excluded);
    }
  });

  it("does not list unprefixed marketing URLs that only exist as locale redirects", async () => {
    const paths = (await sitemap()).map((entry) => new URL(entry.url).pathname);

    for (const unprefixed of ["/", "/pricing", "/about", "/support"]) {
      expect(paths).not.toContain(unprefixed);
    }
  });

  it("uses absolute https URLs, matching hreflang, and no duplicates", async () => {
    const entries = await sitemap();
    const urls = entries.map((entry) => entry.url);

    expect(new Set(urls).size).toBe(urls.length);
    for (const entry of entries) {
      expect(entry.url.startsWith("https://") || entry.url.startsWith("http://")).toBe(
        true,
      );
    }

    const pricing = entries.find((entry) => new URL(entry.url).pathname === "/en/pricing");
    const enPricing = pricing?.alternates?.languages?.en;
    const frPricing = pricing?.alternates?.languages?.fr;
    expect(enPricing).toBeDefined();
    expect(frPricing).toBeDefined();
    expect(new URL(enPricing!).pathname).toBe("/en/pricing");
    expect(new URL(frPricing!).pathname).toBe("/fr/pricing");
    expect(pricing?.alternates?.languages?.["x-default"]).toBe(enPricing);
  });
});
