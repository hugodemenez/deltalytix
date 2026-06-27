import { describe, expect, it } from "vitest";
import {
  buildReferralShareUrl,
  isValidReferralSlug,
} from "./referral-url";

describe("buildReferralShareUrl", () => {
  it("builds the localized /ref/ share route", () => {
    expect(
      buildReferralShareUrl("https://www.deltalytix.app", "en", "abc123"),
    ).toBe("https://www.deltalytix.app/en/ref/abc123");
  });

  it("strips trailing slashes from the origin", () => {
    expect(
      buildReferralShareUrl("https://www.deltalytix.app/", "fr", "xyz789"),
    ).toBe("https://www.deltalytix.app/fr/ref/xyz789");
  });

  it("encodes slug segments for the URL path", () => {
    expect(
      buildReferralShareUrl("https://www.deltalytix.app", "en", "ab/c"),
    ).toBe("https://www.deltalytix.app/en/ref/ab%2Fc");
  });
});

describe("isValidReferralSlug", () => {
  it("accepts lowercase alphanumeric slugs", () => {
    expect(isValidReferralSlug("abc123")).toBe(true);
  });

  it("rejects invalid slug formats", () => {
    expect(isValidReferralSlug("")).toBe(false);
    expect(isValidReferralSlug("ABC123")).toBe(false);
    expect(isValidReferralSlug("ab/c")).toBe(false);
  });
});
