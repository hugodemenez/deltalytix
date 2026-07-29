import { describe, expect, it } from "vitest";

import {
  type ConsentSettings,
  isGoogleTagAllowed,
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
