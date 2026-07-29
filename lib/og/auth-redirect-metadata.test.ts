import { describe, expect, it } from "vitest";
import {
  getAuthRedirectMetadata,
  resolveAuthNextOgTarget,
} from "./auth-redirect-metadata";

describe("resolveAuthNextOgTarget", () => {
  it("resolves locale-prefixed connections next paths", () => {
    expect(resolveAuthNextOgTarget("fr/dashboard/connections")).toEqual({
      locale: "fr",
      kind: "connections",
    });
    expect(resolveAuthNextOgTarget("en/dashboard/connections")).toEqual({
      locale: "en",
      kind: "connections",
    });
  });

  it("defaults to English when next has no locale prefix", () => {
    expect(resolveAuthNextOgTarget("dashboard/connections")).toEqual({
      locale: "en",
      kind: "connections",
    });
  });

  it("ignores unrelated next targets", () => {
    expect(resolveAuthNextOgTarget("fr/dashboard")).toBeNull();
    expect(resolveAuthNextOgTarget("fr/pricing")).toBeNull();
    expect(resolveAuthNextOgTarget(undefined)).toBeNull();
  });
});

describe("getAuthRedirectMetadata", () => {
  it("returns French connections OG copy and image URL", () => {
    const metadata = getAuthRedirectMetadata(
      "fr/dashboard/connections",
      "https://beta.deltalytix.app",
    );

    expect(metadata?.description).toContain("connexions broker");
    expect(metadata?.openGraph).toMatchObject({
      locale: "fr_FR",
      images: [
        {
          url: "https://beta.deltalytix.app/fr/dashboard/connections/opengraph-image",
          width: 1200,
          height: 630,
        },
      ],
    });
  });

  it("returns null for non-connections redirects", () => {
    expect(getAuthRedirectMetadata("fr/dashboard")).toBeNull();
  });
});
