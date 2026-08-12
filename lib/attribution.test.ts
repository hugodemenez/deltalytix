import { describe, expect, it } from "vitest";

import {
  attributionFromStripeMetadata,
  attributionToPostHogProperties,
  attributionToStripeMetadata,
  deserializeAttribution,
  deserializePendingPurchase,
  hasAttribution,
  mergeAttributionFirstTouch,
  parseAttributionParams,
  resolveCheckoutRevenueMajor,
  serializeAttribution,
} from "./attribution";

describe("parseAttributionParams", () => {
  it("reads utm and google click ids from URLSearchParams", () => {
    const params = new URLSearchParams({
      utm_source: "google",
      utm_medium: "cpc",
      utm_campaign: "relaunch",
      utm_content: "adgroup1",
      utm_term: "trading journal",
      gclid: "Cj0KCQ",
      gbraid: "gbraid-1",
      ignored: "nope",
    });

    expect(parseAttributionParams(params)).toEqual({
      utm_source: "google",
      utm_medium: "cpc",
      utm_campaign: "relaunch",
      utm_content: "adgroup1",
      utm_term: "trading journal",
      gclid: "Cj0KCQ",
      gbraid: "gbraid-1",
    });
  });

  it("ignores blank values", () => {
    expect(
      parseAttributionParams({ utm_source: "  ", gclid: "abc" }),
    ).toEqual({ gclid: "abc" });
  });
});

describe("mergeAttributionFirstTouch", () => {
  it("keeps the first touch and fills missing keys only", () => {
    expect(
      mergeAttributionFirstTouch(
        { utm_source: "google", gclid: "first" },
        { utm_source: "bing", utm_medium: "cpc", gclid: "second" },
      ),
    ).toEqual({
      utm_source: "google",
      utm_medium: "cpc",
      gclid: "first",
    });
  });
});

describe("serialize/deserialize", () => {
  it("round-trips attribution JSON", () => {
    const original = { utm_source: "google", gclid: "x" };
    expect(deserializeAttribution(serializeAttribution(original))).toEqual(
      original,
    );
  });

  it("rejects invalid pending purchases and zero revenue", () => {
    expect(deserializePendingPurchase('{"revenue":0,"currency":"eur"}')).toBeNull();
    expect(
      deserializePendingPurchase('{"revenue":29,"currency":"eur","plan":"PRO"}'),
    ).toEqual({ revenue: 29, currency: "eur", plan: "PRO" });
  });
});

describe("posthog + stripe mappers", () => {
  it("emits $utm_* and gclid for PostHog", () => {
    expect(
      attributionToPostHogProperties({
        utm_source: "google",
        utm_medium: "cpc",
        gclid: "abc",
      }),
    ).toMatchObject({
      $utm_source: "google",
      utm_source: "google",
      $utm_medium: "cpc",
      gclid: "abc",
    });
  });

  it("round-trips through Stripe metadata", () => {
    const attribution = { utm_source: "google", gclid: "abc" };
    expect(
      attributionFromStripeMetadata(attributionToStripeMetadata(attribution)),
    ).toEqual(attribution);
  });

  it("hasAttribution is false for empty objects", () => {
    expect(hasAttribution({})).toBe(false);
    expect(hasAttribution({ gclid: "x" })).toBe(true);
  });
});

describe("resolveCheckoutRevenueMajor", () => {
  it("prefers amount_total when present and positive", () => {
    expect(
      resolveCheckoutRevenueMajor({
        amountTotal: 2900,
        lineItemAmountTotal: 1000,
        priceUnitAmount: 5000,
      }),
    ).toBe(29);
  });

  it("falls back to line item then price when amount_total is missing", () => {
    expect(
      resolveCheckoutRevenueMajor({
        amountTotal: null,
        lineItemAmountTotal: 4500,
        priceUnitAmount: 5000,
      }),
    ).toBe(45);

    expect(
      resolveCheckoutRevenueMajor({
        amountTotal: undefined,
        lineItemAmountTotal: null,
        priceUnitAmount: 9900,
      }),
    ).toBe(99);
  });

  it("returns 0 only for an explicit Stripe zero total", () => {
    expect(
      resolveCheckoutRevenueMajor({
        amountTotal: 0,
        lineItemAmountTotal: null,
        priceUnitAmount: null,
      }),
    ).toBe(0);
  });

  it("returns null when no amount can be resolved", () => {
    expect(
      resolveCheckoutRevenueMajor({
        amountTotal: null,
        lineItemAmountTotal: null,
        priceUnitAmount: null,
      }),
    ).toBeNull();
  });
});
