import { describe, expect, it } from "vitest";

import {
  type ConsentSettings,
  DEFAULT_CONSENT_SETTINGS,
  fromRecordChoices,
  hasAnalyticsConsentFromStores,
  hasConsentDecisionFromStores,
  isGoogleTagAllowed,
  parseSharedAnalyticsConsent,
  toGoogleConsent,
  toRecordChoices,
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

describe("fromRecordChoices", () => {
  it("maps Product use to analytics and Ads to ad_storage", () => {
    expect(
      fromRecordChoices({ productUse: true, ads: true }),
    ).toMatchObject({
      analytics_storage: true,
      ad_storage: true,
    });
  });

  it("keeps both optional switches off as the real refuse", () => {
    expect(fromRecordChoices({ productUse: false, ads: false })).toEqual(
      DEFAULT_CONSENT_SETTINGS,
    );
  });

  it("never enables an ad profile", () => {
    expect(fromRecordChoices({ productUse: true, ads: true })).toMatchObject({
      ad_user_data: false,
      ad_personalization: false,
    });
  });

  it("keeps necessary cookies on without listing them as a choice", () => {
    expect(fromRecordChoices({ productUse: false, ads: false })).toMatchObject({
      functionality_storage: true,
      security_storage: true,
    });
  });
});

describe("toRecordChoices", () => {
  it("prefers the shared analytics cookie for Product use", () => {
    expect(
      toRecordChoices({ analytics_storage: true, ad_storage: true }, false),
    ).toEqual({ productUse: false, ads: true });
  });

  it("defaults both switches off when nothing is stored", () => {
    expect(toRecordChoices(null)).toEqual({ productUse: false, ads: false });
  });
});

describe("hasConsentDecisionFromStores", () => {
  it("treats a saved both-off payload as a decision", () => {
    expect(
      hasConsentDecisionFromStores({
        cookieHeader: "",
        storedConsent: DEFAULT_CONSENT_SETTINGS,
      }),
    ).toBe(true);
  });

  it("treats a shared analytics cookie as a decision", () => {
    expect(
      hasConsentDecisionFromStores({
        cookieHeader: "deltalytix_analytics_consent=denied",
        storedConsent: null,
      }),
    ).toBe(true);
  });

  it("is unanswered when neither store has a decision", () => {
    expect(
      hasConsentDecisionFromStores({
        cookieHeader: "",
        storedConsent: null,
      }),
    ).toBe(false);
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
