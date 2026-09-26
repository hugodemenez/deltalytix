import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./route.ts", import.meta.url), "utf8");

describe("Stripe webhook subscription_purchased", () => {
  it("does not gate the conversion on the browser analytics cookie", () => {
    expect(source).not.toMatch(
      /analytics_consent === ['"]granted['"] && user\?\.id/,
    );
    expect(source).toMatch(/buildSubscriptionPurchasedCapture/);
    expect(source).toMatch(/shutdownPostHog/);
    expect(source).toMatch(/promo_code/);
    expect(source).toMatch(/visitor_country/);
  });
});
