import { describe, expect, it } from "vitest";
import {
  CANONICAL_SITE_ORIGIN,
  getCanonicalOrigin,
  siteUrl,
} from "./site-url";

const productionApex = CANONICAL_SITE_ORIGIN.replace("://www.", "://");

describe("getCanonicalOrigin", () => {
  it("collapses production apex and www to www", () => {
    expect(getCanonicalOrigin(productionApex)).toBe(CANONICAL_SITE_ORIGIN);
    expect(getCanonicalOrigin(CANONICAL_SITE_ORIGIN)).toBe(CANONICAL_SITE_ORIGIN);
    expect(getCanonicalOrigin(`${productionApex}/en/pricing`)).toBe(
      CANONICAL_SITE_ORIGIN,
    );
  });

  it("leaves preview, localhost, and custom hosts unchanged", () => {
    expect(getCanonicalOrigin("https://beta.deltalytix.app")).toBe(
      "https://beta.deltalytix.app",
    );
    expect(getCanonicalOrigin("http://localhost:3000")).toBe("http://localhost:3000");
    expect(getCanonicalOrigin("https://deltalytix-git-foo.vercel.app")).toBe(
      "https://deltalytix-git-foo.vercel.app",
    );
  });
});

describe("siteUrl", () => {
  it("emits www URLs for production hosts, including locale paths", () => {
    expect(siteUrl("/en/pricing", productionApex)).toBe(
      `${CANONICAL_SITE_ORIGIN}/en/pricing`,
    );
    expect(siteUrl("/fr", CANONICAL_SITE_ORIGIN)).toBe(`${CANONICAL_SITE_ORIGIN}/fr`);
  });
});
