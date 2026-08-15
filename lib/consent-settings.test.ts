import { describe, expect, it } from "vitest";

import {
  type ConsentSettings,
  hasAnalyticsConsentFromStores,
  isGoogleTagAllowed,
  parseSharedAnalyticsConsent,
  toGoogleConsent,
} from "./consent-settings";

const denyAll: ConsentSettings = {
  analytics_storage: false,
  ad_storage: false,
  ad_user_data: false,
  ad_personalization: false,
  functionality_storage: false,
  personalization_storage: false,
  security_storage: false,
};

describe("toGoogleConsent", () => {
  it("maps every category to Google's vocabulary", () => {
    expect(toGoogleConsent({ ...denyAll, analytics_storage: true })).toEqual({
      analytics_storage: "granted",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      functionality_storage: "denied",
      personalization_storage: "denied",
      security_storage: "denied",
    });
  });

  it("denies categories missing from a legacy payload", () => {
    expect(toGoogleConsent({ analytics_storage: true })).toMatchObject({
      analytics_storage: "granted",
      ad_user_data: "denied",
      security_storage: "denied",
    });
  });
});

describe("isGoogleTagAllowed", () => {
  it("allows the tag on analytics consent alone", () => {
    expect(isGoogleTagAllowed({ ...denyAll, analytics_storage: true })).toBe(true);
  });

  it("allows the tag on ad consent alone, so Ads conversions still fire", () => {
    expect(isGoogleTagAllowed({ ...denyAll, ad_storage: true })).toBe(true);
  });

  it("blocks the tag when both are refused", () => {
    expect(
      isGoogleTagAllowed({ ...denyAll, functionality_storage: true }),
    ).toBe(false);
  });
});

describe("parseSharedAnalyticsConsent", () => {
  it("reads granted and denied from the shared cookie", () => {
    expect(
      parseSharedAnalyticsConsent("deltalytix_analytics_consent=granted"),
    ).toBe(true);
    expect(
      parseSharedAnalyticsConsent("other=1; deltalytix_analytics_consent=denied"),
    ).toBe(false);
  });

  it("returns null when the cookie is missing or unknown", () => {
    expect(parseSharedAnalyticsConsent("")).toBeNull();
    expect(
      parseSharedAnalyticsConsent("deltalytix_analytics_consent=maybe"),
    ).toBeNull();
  });
});

describe("hasAnalyticsConsentFromStores", () => {
  it("prefers the shared cookie over a stale localStorage choice", () => {
    expect(
      hasAnalyticsConsentFromStores({
        cookieHeader: "deltalytix_analytics_consent=denied",
        storedConsent: { analytics_storage: true },
      }),
    ).toBe(false);
  });

  it("falls back to localStorage when the cookie is absent", () => {
    expect(
      hasAnalyticsConsentFromStores({
        cookieHeader: "",
        storedConsent: { analytics_storage: true },
      }),
    ).toBe(true);
  });

  it("denies when neither store has granted analytics", () => {
    expect(
      hasAnalyticsConsentFromStores({
        cookieHeader: "",
        storedConsent: null,
      }),
    ).toBe(false);
  });
});
