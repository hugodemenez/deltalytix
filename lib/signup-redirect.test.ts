import { describe, expect, it } from "vitest";

import {
  applySignupSuccess,
  resolveInternalDestination,
  signupRedirectPath,
} from "./signup-redirect";

const ORIGIN = "https://deltalytix.app";

describe("applySignupSuccess", () => {
  it("marks a new user's destination", () => {
    const url = applySignupSuccess(new URL("/dashboard", ORIGIN), true);
    expect(url.searchParams.get("signup")).toBe("success");
  });

  it("leaves a returning user's destination untouched", () => {
    const url = applySignupSuccess(new URL("/dashboard", ORIGIN), false);
    expect(url.searchParams.has("signup")).toBe(false);
  });

  it("preserves existing query parameters", () => {
    const url = applySignupSuccess(
      new URL("/dashboard?tab=trades", ORIGIN),
      true,
    );
    expect(url.searchParams.get("tab")).toBe("trades");
    expect(url.searchParams.get("signup")).toBe("success");
  });
});

describe("resolveInternalDestination", () => {
  it.each(["/dashboard", "/fr/dashboard", "/dashboard/settings?tab=billing"])(
    "keeps the internal destination %s",
    (target) => {
      expect(resolveInternalDestination(target, ORIGIN).pathname).toBe(
        new URL(target, ORIGIN).pathname,
      );
    },
  );

  it.each([null, undefined, ""])("falls back to the dashboard for %s", (target) => {
    expect(resolveInternalDestination(target, ORIGIN).href).toBe(
      `${ORIGIN}/dashboard`,
    );
  });

  it.each([
    "https://evil.example/steal",
    "//evil.example/steal",
    "http://deltalytix.app.evil.example/steal",
  ])("refuses the off-origin destination %s", (target) => {
    expect(resolveInternalDestination(target, ORIGIN).href).toBe(
      `${ORIGIN}/dashboard`,
    );
  });
});

describe("signupRedirectPath", () => {
  it("defaults a new user to the marked dashboard", () => {
    expect(signupRedirectPath(null, true)).toBe("/dashboard?signup=success");
  });

  it("defaults a returning user to the plain dashboard", () => {
    expect(signupRedirectPath(null, false)).toBe("/dashboard");
  });

  it("marks an explicit next destination rather than dropping it", () => {
    expect(signupRedirectPath("/dashboard/billing", true)).toBe(
      "/dashboard/billing?signup=success",
    );
  });

  it("keeps locale-prefixed destinations", () => {
    expect(signupRedirectPath("/fr/dashboard", true)).toBe(
      "/fr/dashboard?signup=success",
    );
  });

  it("preserves query and hash", () => {
    expect(signupRedirectPath("/dashboard?tab=trades#recent", true)).toBe(
      "/dashboard?tab=trades&signup=success#recent",
    );
  });

  it("never marks an off-origin destination", () => {
    expect(signupRedirectPath("https://evil.example/steal", true)).toBe(
      "https://evil.example/steal",
    );
  });
});
