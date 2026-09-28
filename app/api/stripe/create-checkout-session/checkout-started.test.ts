import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const source = readFileSync(
  new URL("./route.ts", import.meta.url),
  "utf8",
);

describe("checkout_started server capture", () => {
  it("always sends the conversion with plan, currency, amount and promo", () => {
    expect(source).toMatch(/buildCheckoutStartedCapture/);
    expect(source).toMatch(/posthog_distinct_id: user\.id/);
    expect(source).toMatch(/visitor_country/);
    expect(source).toMatch(/consentDenied/);
    expect(source).toMatch(/analytics_consent: 'denied'/);
    expect(source).toMatch(/promo_code/);
    expect(source).toMatch(/amount/);
  });
});
