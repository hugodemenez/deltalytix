import { describe, expect, it } from "vitest";

import {
  CHECKOUT_STARTED_EVENT,
  SUBSCRIPTION_PURCHASED_EVENT,
  buildCheckoutStartedCapture,
  buildSubscriptionPurchasedCapture,
  isConversionEvent,
  sanitizeConversionProperties,
} from "./conversion-analytics";
import { USER_SIGNED_UP_EVENT } from "./signup-analytics";

describe("sanitizeConversionProperties", () => {
  it("strips email for EU and unknown countries", () => {
    expect(
      sanitizeConversionProperties(
        { email: "a@b.com", plan: "PRO", $set: { email: "a@b.com" } },
        "FR",
      ),
    ).toEqual({ plan: "PRO", $set: {} });
    expect(
      sanitizeConversionProperties({ email: "a@b.com", plan: "PRO" }, null),
    ).toEqual({ plan: "PRO" });
  });

  it("keeps email for US visitors when a caller passed one", () => {
    expect(
      sanitizeConversionProperties({ email: "a@b.com", plan: "PRO" }, "US"),
    ).toEqual({ email: "a@b.com", plan: "PRO" });
  });
});

describe("buildCheckoutStartedCapture", () => {
  it("skips the consent cookie and pins $insert_id to the checkout session", () => {
    const capture = buildCheckoutStartedCapture({
      distinctId: "user-1",
      country: "FR",
      properties: {
        plan: "PRO",
        currency: "eur",
        promo_code: "BACK2WORK",
        amount: 49,
        email: "hidden@example.com",
        stripe_checkout_session_id: "cs_test_1",
      },
    });

    expect(capture.event).toBe(CHECKOUT_STARTED_EVENT);
    expect(capture.skipConsent).toBe(true);
    expect(capture.properties.$insert_id).toBe("checkout_started:cs_test_1");
    expect(capture.properties.email).toBeUndefined();
    expect(capture.properties.plan).toBe("PRO");
    expect(capture.properties.promo_code).toBe("BACK2WORK");
    expect(capture.properties.amount).toBe(49);
  });
});

describe("buildSubscriptionPurchasedCapture", () => {
  it("is idempotent on the Stripe event id and omits EU email", () => {
    const first = buildSubscriptionPurchasedCapture({
      distinctId: "user-1",
      stripeEventId: "evt_1",
      country: "DE",
      properties: {
        plan: "PRO",
        currency: "eur",
        amount: 49,
        email: "hidden@example.com",
      },
    });
    const retry = buildSubscriptionPurchasedCapture({
      distinctId: "user-1",
      stripeEventId: "evt_1",
      country: "DE",
      properties: { plan: "PRO" },
    });

    expect(first.event).toBe(SUBSCRIPTION_PURCHASED_EVENT);
    expect(first.skipConsent).toBe(true);
    expect(first.properties.$insert_id).toBe("subscription_purchased:evt_1");
    expect(first.properties.email).toBeUndefined();
    expect(retry.properties.$insert_id).toBe(first.properties.$insert_id);
  });
});

describe("isConversionEvent", () => {
  it("treats signup, checkout and purchase as conversions", () => {
    expect(isConversionEvent(USER_SIGNED_UP_EVENT)).toBe(true);
    expect(isConversionEvent(CHECKOUT_STARTED_EVENT)).toBe(true);
    expect(isConversionEvent(SUBSCRIPTION_PURCHASED_EVENT)).toBe(true);
    expect(isConversionEvent("connection_created")).toBe(false);
  });
});
