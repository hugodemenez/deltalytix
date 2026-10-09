import { describe, expect, it } from "vitest";

import {
  attributionFromStripeMetadata,
  attributionToPostHogProperties,
  attributionToStripeMetadata,
  clearPendingPurchaseCookie,
  deserializeAttribution,
  deserializePendingPurchase,
  hasAttribution,
  mergeAttributionFirstTouch,
  parseAttributionParams,
  planAttributionStorage,
  resolveCheckoutRevenueMajor,
  serializeAttribution,
  withoutClickIds,
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
      deserializePendingPurchase(
        '{"revenue":29,"currency":"eur","plan":"PRO"}',
      ),
    ).toBeNull();
    expect(
      deserializePendingPurchase(
        '{"revenue":29,"currency":"eur","transaction_id":"cs_test_123","plan":"PRO"}',
      ),
    ).toEqual({
      revenue: 29,
      currency: "eur",
      transaction_id: "cs_test_123",
      plan: "PRO",
    });
  });
});

describe("posthog + stripe mappers", () => {
  it("namespaces PostHog properties under first_touch_", () => {
    expect(
      attributionToPostHogProperties({
        utm_source: "google",
        utm_medium: "cpc",
        gclid: "abc",
      }),
    ).toEqual({
      first_touch_utm_source: "google",
      first_touch_utm_medium: "cpc",
      first_touch_gclid: "abc",
    });
  });

  it("never emits PostHog's own last-touch campaign keys", () => {
    const props = attributionToPostHogProperties({
      utm_source: "google",
      gclid: "abc",
    });
    // `$utm_*` / `$gclid` belong to PostHog and are last-touch; writing
    // first-touch values there would shadow them on every later event.
    expect(Object.keys(props).some((key) => key.startsWith("$"))).toBe(false);
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

describe("clearPendingPurchaseCookie", () => {
  it("mirrors the Domain the server wrote on deltalytix hosts", () => {
    const headers = clearPendingPurchaseCookie("beta.deltalytix.app");
    expect(headers).toHaveLength(2);
    expect(headers.some((header) => header.includes("Domain=.deltalytix.app"))).toBe(
      true,
    );
    expect(headers.every((header) => header.includes("Max-Age=0"))).toBe(true);
  });

  it("omits Domain off the production hosts", () => {
    expect(clearPendingPurchaseCookie("localhost")).toEqual([
      "deltalytix_pending_purchase=; Max-Age=0; Path=/; SameSite=Lax",
    ]);
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

  it("returns 0 for an explicit Stripe zero total", () => {
    expect(
      resolveCheckoutRevenueMajor({
        amountTotal: 0,
        lineItemAmountTotal: null,
        priceUnitAmount: null,
      }),
    ).toBe(0);
  });

  it("does not fall through a zero total to the catalog price", () => {
    // 100%-off coupon or fully discounted trial: Stripe settled 0, so the
    // list price must not be reported as revenue.
    expect(
      resolveCheckoutRevenueMajor({
        amountTotal: 0,
        priceUnitAmount: 2900,
      }),
    ).toBe(0);

    expect(
      resolveCheckoutRevenueMajor({
        amountTotal: null,
        lineItemAmountTotal: 0,
        priceUnitAmount: 2900,
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

describe("withoutClickIds", () => {
  it("drops Google click ids and keeps UTM labels", () => {
    expect(
      withoutClickIds({
        utm_source: "google",
        utm_campaign: "relaunch",
        gclid: "g",
        gbraid: "b",
        wbraid: "w",
      }),
    ).toEqual({ utm_source: "google", utm_campaign: "relaunch" });
  });
});

describe("planAttributionStorage", () => {
  const full = { utm_source: "google", gclid: "g" };

  it("persists everything with ad storage granted", () => {
    expect(
      planAttributionStorage({
        stored: null,
        incoming: full,
        adStorage: true,
        analyticsStorage: false,
      }),
    ).toEqual({ action: "persist", attribution: full });
  });

  it("keeps first-touch values over later landings", () => {
    expect(
      planAttributionStorage({
        stored: { gclid: "first" },
        incoming: { gclid: "second", utm_source: "google" },
        adStorage: true,
        analyticsStorage: true,
      }),
    ).toEqual({
      action: "persist",
      attribution: { gclid: "first", utm_source: "google" },
    });
  });

  it("persists UTMs without click ids when only analytics is granted", () => {
    expect(
      planAttributionStorage({
        stored: null,
        incoming: full,
        adStorage: false,
        analyticsStorage: true,
      }),
    ).toEqual({ action: "persist", attribution: { utm_source: "google" } });
  });

  it("clears a stored click id once ad storage is withdrawn", () => {
    expect(
      planAttributionStorage({
        stored: { gclid: "g" },
        incoming: null,
        adStorage: false,
        analyticsStorage: true,
      }),
    ).toEqual({ action: "clear" });
  });

  it("clears stored attribution when both are denied", () => {
    expect(
      planAttributionStorage({
        stored: full,
        incoming: full,
        adStorage: false,
        analyticsStorage: false,
      }),
    ).toEqual({ action: "clear" });
  });

  it("writes nothing before consent when nothing is stored", () => {
    expect(
      planAttributionStorage({
        stored: null,
        incoming: full,
        adStorage: false,
        analyticsStorage: false,
      }),
    ).toEqual({ action: "none" });
  });
});
