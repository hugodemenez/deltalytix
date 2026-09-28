import { describe, expect, it } from "vitest";

import {
  CONSENT_REQUIRED_COUNTRIES,
  normalizeCountryCode,
  readCountryFromCookieHeader,
  readCountryFromHeaders,
  requiresCookieConsent,
} from "./consent-region";

describe("requiresCookieConsent", () => {
  it("requires a banner for EEA, UK and Switzerland", () => {
    expect(requiresCookieConsent("FR")).toBe(true);
    expect(requiresCookieConsent("DE")).toBe(true);
    expect(requiresCookieConsent("gb")).toBe(true);
    expect(requiresCookieConsent("CH")).toBe(true);
    expect(requiresCookieConsent("NO")).toBe(true);
  });

  it("does not require a banner for the US and other non-EU countries", () => {
    expect(requiresCookieConsent("US")).toBe(false);
    expect(requiresCookieConsent("CA")).toBe(false);
    expect(requiresCookieConsent("AU")).toBe(false);
    expect(requiresCookieConsent("BR")).toBe(false);
  });

  it("uses EU behaviour when the country is unknown", () => {
    expect(requiresCookieConsent(null)).toBe(true);
    expect(requiresCookieConsent(undefined)).toBe(true);
    expect(requiresCookieConsent("")).toBe(true);
    expect(requiresCookieConsent("USA")).toBe(true);
  });

  it("covers every listed consent-region code", () => {
    for (const country of CONSENT_REQUIRED_COUNTRIES) {
      expect(requiresCookieConsent(country)).toBe(true);
    }
  });
});

describe("readCountryFromHeaders", () => {
  it("prefers x-user-country over x-vercel-ip-country", () => {
    const headers = new Headers({
      "x-user-country": "fr",
      "x-vercel-ip-country": "US",
    });
    expect(readCountryFromHeaders(headers)).toBe("FR");
  });

  it("falls back to x-vercel-ip-country", () => {
    const headers = new Headers({ "x-vercel-ip-country": "US" });
    expect(readCountryFromHeaders(headers)).toBe("US");
  });
});

describe("readCountryFromCookieHeader", () => {
  it("reads the user-country cookie", () => {
    expect(readCountryFromCookieHeader("user-country=DE; other=1")).toBe("DE");
  });

  it("returns null when the cookie is missing", () => {
    expect(readCountryFromCookieHeader("")).toBeNull();
  });
});

describe("normalizeCountryCode", () => {
  it("uppercases a two-letter code and rejects junk", () => {
    expect(normalizeCountryCode(" us ")).toBe("US");
    expect(normalizeCountryCode("France")).toBeNull();
  });
});
