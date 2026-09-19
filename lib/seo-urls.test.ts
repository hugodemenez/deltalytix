import { describe, expect, it } from "vitest";
import {
  createPublicPageMetadata,
  isExcludedFromSitemap,
  languageAlternateUrls,
  localizedPath,
  PUBLIC_SITEMAP_ROUTES,
  publicPageAlternates,
  stripLocalePrefix,
} from "./seo-urls";

describe("localizedPath", () => {
  it("prefixes the locale and keeps the homepage without a trailing slash", () => {
    expect(localizedPath("en", "/")).toBe("/en");
    expect(localizedPath("fr", "/pricing")).toBe("/fr/pricing");
    expect(localizedPath("en", "about")).toBe("/en/about");
  });
});

describe("stripLocalePrefix", () => {
  it("removes any proxy locale, not only indexable ones", () => {
    expect(stripLocalePrefix("/en/pricing")).toBe("/pricing");
    expect(stripLocalePrefix("/de/dashboard/settings")).toBe("/dashboard/settings");
    expect(stripLocalePrefix("/pricing")).toBe("/pricing");
    expect(stripLocalePrefix("/en")).toBe("/");
  });
});

describe("isExcludedFromSitemap", () => {
  it("excludes robots-disallowed and private routes, including locale prefixes", () => {
    for (const path of [
      "/authentication",
      "/en/authentication",
      "/fr/authentication/callback",
      "/dashboard",
      "/en/dashboard",
      "/api/health",
      "/settings",
      "/en/settings",
      "/admin",
      "/fr/admin/send-email",
    ]) {
      expect(isExcludedFromSitemap(path), path).toBe(true);
    }
  });

  it("keeps public marketing paths", () => {
    for (const path of ["/en", "/fr/pricing", "/en/about", "/docs/api", "/llms.txt"]) {
      expect(isExcludedFromSitemap(path), path).toBe(false);
    }
  });
});

describe("publicPageAlternates", () => {
  it("self-canonicalizes with www locale URLs and matching hreflang", () => {
    const www = "https://www.deltalytix.app";
    const origin = www.replace("://www.", "://");
    const alternates = publicPageAlternates("en", "/pricing", origin);

    expect(alternates.canonical).toBe(`${www}/en/pricing`);
    expect(alternates.languages).toEqual({
      en: `${www}/en/pricing`,
      fr: `${www}/fr/pricing`,
      "x-default": `${www}/en/pricing`,
    });
  });

  it("canonicalizes the French homepage to /fr, not the apex", () => {
    const alternates = publicPageAlternates("fr", "/", "https://www.deltalytix.app");

    expect(alternates.canonical).toBe("https://www.deltalytix.app/fr");
    expect(languageAlternateUrls("/", "https://www.deltalytix.app")["x-default"]).toBe(
      "https://www.deltalytix.app/en",
    );
  });
});

describe("createPublicPageMetadata", () => {
  it("returns per-page canonicals from locale params", async () => {
    const generateMetadata = createPublicPageMetadata("/about");
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: "fr" }),
    });
    const canonical = String(metadata.alternates?.canonical);

    expect(new URL(canonical).pathname).toBe("/fr/about");
  });
});

describe("PUBLIC_SITEMAP_ROUTES", () => {
  it("does not list robots-disallowed or private paths", () => {
    for (const route of PUBLIC_SITEMAP_ROUTES) {
      expect(isExcludedFromSitemap(route.path), route.path).toBe(false);
    }

    const paths = PUBLIC_SITEMAP_ROUTES.map((route) => route.path);
    expect(paths).not.toContain("/authentication");
    expect(paths).not.toContain("/settings");
    expect(paths).not.toContain("/dashboard");
  });
});
