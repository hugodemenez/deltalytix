import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  CONSENT_UPDATED_EVENT,
  DEFAULT_CONSENT_SETTINGS,
  toGoogleConsent,
} from "@/lib/consent-settings";

describe("Google tag consent update", () => {
  beforeEach(() => {
    const gtag = vi.fn();
    const target = new EventTarget();
    vi.stubGlobal("window", Object.assign(target, {
      location: {
        hostname: "deltalytix.app",
        protocol: "https:",
        href: "https://deltalytix.app/",
      },
      dataLayer: [] as unknown[],
      gtag,
    }));
    vi.stubGlobal("document", {
      cookie: "",
      querySelector: () => ({ dataset: { googleTag: "AW-test" } }),
      createElement: () => ({
        async: false,
        src: "",
        dataset: {} as Record<string, string>,
      }),
      head: { appendChild: vi.fn() },
    });
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(() =>
        JSON.stringify({
          ...DEFAULT_CONSENT_SETTINGS,
          analytics_storage: false,
          ad_storage: false,
          ad_user_data: false,
          ad_personalization: false,
        }),
      ),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("sends gtag('consent','update', …) when consent is updated", () => {
    const gtag = window.gtag as unknown as ReturnType<typeof vi.fn>;
    const detail = toGoogleConsent({
      ...DEFAULT_CONSENT_SETTINGS,
      analytics_storage: false,
      ad_storage: false,
      ad_user_data: false,
      ad_personalization: false,
    });

    window.gtag?.("consent", "update", detail);

    expect(gtag).toHaveBeenCalledWith("consent", "update", detail);
    expect(gtag.mock.calls[0]?.[0]).toBe("consent");
    expect(gtag.mock.calls[0]?.[1]).toBe("update");
  });

  it("dispatches CONSENT_UPDATED_EVENT for the Google tag listener", () => {
    const listener = vi.fn();
    window.addEventListener(CONSENT_UPDATED_EVENT, listener);
    window.dispatchEvent(
      new CustomEvent(CONSENT_UPDATED_EVENT, {
        detail: toGoogleConsent(DEFAULT_CONSENT_SETTINGS),
      }),
    );
    expect(listener).toHaveBeenCalledOnce();
  });
});
