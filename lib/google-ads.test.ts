import { createHash } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  normalizeEmailForAds,
  resolveConversionSendTo,
  setAdsHashedEmail,
  waitForAdsHashedEmail,
} from "./google-ads";
import { hashEmailForAds } from "./google-ads-server";

describe("resolveConversionSendTo", () => {
  it("joins the Ads id and the label", () => {
    expect(
      resolveConversionSendTo({ adsId: "AW-123", label: " abcDEF " }),
    ).toBe("AW-123/abcDEF");
  });

  it("accepts a full send_to pasted into the label variable", () => {
    expect(
      resolveConversionSendTo({ adsId: "AW-123", label: "AW-999/xyz" }),
    ).toBe("AW-999/xyz");
  });

  it("prefers the label over the legacy send_to variable", () => {
    expect(
      resolveConversionSendTo({
        adsId: "AW-123",
        label: "new",
        legacySendTo: "AW-123/old",
      }),
    ).toBe("AW-123/new");
  });

  it("falls back to the legacy send_to variable", () => {
    expect(
      resolveConversionSendTo({ adsId: "AW-123", legacySendTo: "AW-123/old" }),
    ).toBe("AW-123/old");
  });

  it("is empty when nothing is configured, so no Ads conversion is sent", () => {
    expect(resolveConversionSendTo({ adsId: "AW-123", label: "  " })).toBe("");
  });
});

describe("normalizeEmailForAds", () => {
  it("trims and lowercases", () => {
    expect(normalizeEmailForAds("  Jane.Doe@Example.COM ")).toBe(
      "jane.doe@example.com",
    );
  });

  it("drops dots and +tags for gmail addresses", () => {
    expect(normalizeEmailForAds("Jane.Doe+ads@gmail.com")).toBe(
      "janedoe@gmail.com",
    );
    expect(normalizeEmailForAds("j.d@googlemail.com")).toBe(
      "jd@googlemail.com",
    );
  });

  it("rejects values that are not email addresses", () => {
    expect(normalizeEmailForAds("not-an-email")).toBeNull();
    expect(normalizeEmailForAds("@example.com")).toBeNull();
    expect(normalizeEmailForAds("jane@")).toBeNull();
  });
});

describe("hashEmailForAds", () => {
  it("hashes the normalised address as lowercase hex SHA-256", () => {
    const expected = createHash("sha256")
      .update("janedoe@gmail.com")
      .digest("hex");
    expect(hashEmailForAds(" Jane.Doe@Gmail.com")).toBe(expected);
    expect(hashEmailForAds(" Jane.Doe@Gmail.com")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("returns null without a usable email", () => {
    expect(hashEmailForAds(null)).toBeNull();
    expect(hashEmailForAds("nope")).toBeNull();
  });
});

describe("waitForAdsHashedEmail", () => {
  it("resolves once the dashboard publishes the hash", async () => {
    setAdsHashedEmail(null);
    const pending = waitForAdsHashedEmail(1000);
    setAdsHashedEmail("abc");
    await expect(pending).resolves.toBe("abc");
    setAdsHashedEmail(null);
  });

  it("resolves null when no hash arrives in time", async () => {
    setAdsHashedEmail(null);
    await expect(waitForAdsHashedEmail(5)).resolves.toBeNull();
  });
});
