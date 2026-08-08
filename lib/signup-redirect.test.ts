import { describe, expect, it } from "vitest";

import {
  applySignupSuccess,
  hasSignupSuccess,
  resolveInternalDestination,
  resolveNextPath,
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

describe("hasSignupSuccess", () => {
  it("recognises the marker so checkout can forward it", () => {
    const { searchParams } = new URL(
      "/api/stripe/create-checkout-session?lookup_key=pro&signup=success",
      ORIGIN,
    );
    expect(hasSignupSuccess(searchParams)).toBe(true);
  });

  it.each(["", "?lookup_key=pro", "?signup=", "?signup=true"])(
    "rejects %s",
    (query) => {
      const { searchParams } = new URL(`/checkout${query}`, ORIGIN);
      expect(hasSignupSuccess(searchParams)).toBe(false);
    },
  );

  it("round-trips what applySignupSuccess writes", () => {
    const url = applySignupSuccess(new URL("/checkout", ORIGIN), true);
    expect(hasSignupSuccess(url.searchParams)).toBe(true);
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
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
  ])("refuses the off-origin destination %s", (target) => {
    expect(resolveInternalDestination(target, ORIGIN).href).toBe(
      `${ORIGIN}/dashboard`,
    );
  });
});

describe("resolveNextPath", () => {
  it.each([
    ["dashboard", "/dashboard"],
    ["fr/dashboard", "/fr/dashboard"],
    ["dashboard/settings?tab=billing", "/dashboard/settings?tab=billing"],
    ["teams/dashboard?team=1#members", "/teams/dashboard?team=1#members"],
  ])("keeps the internal destination %s", (nextParam, expected) => {
    expect(resolveNextPath(nextParam, ORIGIN)).toBe(expected);
  });

  it.each([null, undefined, ""])("falls back to the dashboard for %s", (nextParam) => {
    expect(resolveNextPath(nextParam, ORIGIN)).toBe("/dashboard");
  });

  // A `next` that re-prefixes into a protocol-relative URL would otherwise turn
  // the authentication redirect into an open redirect.
  it.each(["/evil.example", "/evil.example/steal", "\\evil.example", "/\\evil.example"])(
    "refuses the protocol-relative destination %s",
    (nextParam) => {
      expect(resolveNextPath(nextParam, ORIGIN)).toBe("/dashboard");
    },
  );

  // The returned value is used as a redirect target, so the invariant that
  // matters is that it can never resolve off this origin — whether it lands on
  // the dashboard or on a harmless same-origin path.
  it.each([
    "/evil.example",
    "\\evil.example",
    "https://evil.example/steal",
    "javascript:alert(1)",
    "%2F%2Fevil.example",
  ])("never resolves %s off-origin", (nextParam) => {
    const resolved = new URL(resolveNextPath(nextParam, ORIGIN), ORIGIN);
    expect(resolved.origin).toBe(ORIGIN);
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

  it("keeps a relative next such as the checkout endpoint", () => {
    expect(
      signupRedirectPath("api/stripe/create-checkout-session?lookup_key=x", true),
    ).toBe("/api/stripe/create-checkout-session?lookup_key=x&signup=success");
  });

  // The result goes to router.push, so an unrecognised target must never
  // survive: `javascript:` parses as a URL and would otherwise be navigated to.
  it.each([
    "https://evil.example/steal",
    "//evil.example/steal",
    "javascript:alert(1)",
    "JaVaScRiPt:alert(1)",
    "data:text/html,<script>alert(1)</script>",
  ])("refuses to navigate to %s", (target) => {
    expect(signupRedirectPath(target, true)).toBe("/dashboard?signup=success");
  });
});
