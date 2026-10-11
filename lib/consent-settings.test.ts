import { describe, expect, it } from "vitest";

import {
  type ConsentSettings,
  DEFAULT_CONSENT_SETTINGS,
  fromRecordChoices,
  hasAnalyticsConsentFromStores,
  hasConsentDecisionFromStores,
  isExplicitAnalyticsDenialFromStores,
  resolveGoogleConsent,
  shouldShowConsentBannerFromStores,
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

describe("resolveGoogleConsent", () => {
  const optional = (state: ReturnType<typeof resolveGoogleConsent>) => ({
    analytics_storage: state.analytics_storage,
    ad_storage: state.ad_storage,
    ad_user_data: state.ad_user_data,
    ad_personalization: state.ad_personalization,
  });
  const allDenied = {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  };
  const allGranted = {
    analytics_storage: "granted",
    ad_storage: "granted",
    ad_user_data: "granted",
    ad_personalization: "granted",
  };

  it.each(["FR", "DE", "GB", "CH", "NO", null])(
    "denies every optional category by default in the consent region (%s)",
    (country) => {
      expect(
        optional(resolveGoogleConsent({ storedConsent: null, country })),
      ).toEqual(allDenied);
    },
  );

  it.each(["US", "CA", "BR", "AU"])(
    "grants analytics and ads by default outside the consent region (%s)",
    (country) => {
      expect(
        optional(resolveGoogleConsent({ storedConsent: null, country })),
      ).toEqual(allGranted);
    },
  );

  it("keeps necessary storage granted while optional storage is denied", () => {
    const state = resolveGoogleConsent({ storedConsent: null, country: "FR" });
    expect(state.security_storage).toBe("granted");
    expect(state.functionality_storage).toBe("granted");
  });

  it("applies an EEA banner accept without granting user data or personalization", () => {
    expect(
      optional(
        resolveGoogleConsent({
          storedConsent: fromRecordChoices({ productUse: true, ads: true }),
          country: "FR",
        }),
      ),
    ).toEqual({
      analytics_storage: "granted",
      ad_storage: "granted",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
  });

  it("applies an EEA banner decline", () => {
    expect(
      optional(
        resolveGoogleConsent({
          storedConsent: fromRecordChoices({ productUse: false, ads: false }),
          country: "DE",
        }),
      ),
    ).toEqual(allDenied);
  });

  it("lets user data and personalization follow ad storage outside the region", () => {
    expect(
      optional(
        resolveGoogleConsent({
          storedConsent: fromRecordChoices({ productUse: false, ads: true }),
          country: "US",
        }),
      ),
    ).toEqual({
      analytics_storage: "denied",
      ad_storage: "granted",
      ad_user_data: "granted",
      ad_personalization: "granted",
    });
  });

  it("honours an opt-out saved outside the region", () => {
    expect(
      optional(
        resolveGoogleConsent({
          storedConsent: DEFAULT_CONSENT_SETTINGS,
          country: "US",
        }),
      ),
    ).toEqual(allDenied);
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

  it("denies when neither store has granted analytics and country is unknown", () => {
    expect(
      hasAnalyticsConsentFromStores({
        cookieHeader: "",
        storedConsent: null,
      }),
    ).toBe(false);
  });

  it("defaults identified capture on for US visitors with no stored decision", () => {
    expect(
      hasAnalyticsConsentFromStores({
        cookieHeader: "",
        storedConsent: null,
        country: "US",
      }),
    ).toBe(true);
  });

  it("turns identified capture off for a US visitor who opted out", () => {
    expect(
      hasAnalyticsConsentFromStores({
        cookieHeader: "deltalytix_analytics_consent=denied",
        storedConsent: null,
        country: "US",
      }),
    ).toBe(false);
  });

  it("defaults identified capture off for EU visitors with no stored decision", () => {
    expect(
      hasAnalyticsConsentFromStores({
        cookieHeader: "",
        storedConsent: null,
        country: "FR",
      }),
    ).toBe(false);
  });
});

describe("isExplicitAnalyticsDenialFromStores", () => {
  it("is true for a denied shared cookie in any region", () => {
    expect(
      isExplicitAnalyticsDenialFromStores({
        cookieHeader: "deltalytix_analytics_consent=denied",
        storedConsent: null,
      }),
    ).toBe(true);
  });

  it("is false when there is no saved decision", () => {
    expect(
      isExplicitAnalyticsDenialFromStores({
        cookieHeader: "",
        storedConsent: null,
      }),
    ).toBe(false);
  });

  it("is false when analytics was granted", () => {
    expect(
      isExplicitAnalyticsDenialFromStores({
        cookieHeader: "deltalytix_analytics_consent=granted",
        storedConsent: DEFAULT_CONSENT_SETTINGS,
      }),
    ).toBe(false);
  });
});

describe("shouldShowConsentBannerFromStores", () => {
  it("shows the banner for EU visitors with no decision", () => {
    expect(
      shouldShowConsentBannerFromStores({
        cookieHeader: "",
        storedConsent: null,
        country: "FR",
      }),
    ).toBe(true);
  });

  it("hides the banner for US visitors even with no decision", () => {
    expect(
      shouldShowConsentBannerFromStores({
        cookieHeader: "",
        storedConsent: null,
        country: "US",
      }),
    ).toBe(false);
  });

  it("hides the banner once a decision is stored", () => {
    expect(
      shouldShowConsentBannerFromStores({
        cookieHeader: "deltalytix_analytics_consent=denied",
        storedConsent: null,
        country: "FR",
      }),
    ).toBe(false);
  });

  it("shows the banner when country is unknown", () => {
    expect(
      shouldShowConsentBannerFromStores({
        cookieHeader: "",
        storedConsent: null,
        country: null,
      }),
    ).toBe(true);
  });
});
