import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("posthog-js", () => ({
  default: {
    startSessionRecording: vi.fn(),
    stopSessionRecording: vi.fn(),
    opt_in_capturing: vi.fn(),
    opt_out_capturing: vi.fn(),
    has_opted_in_capturing: vi.fn(() => false),
    has_opted_out_capturing: vi.fn(() => false),
    capture: vi.fn(),
    is_capturing: vi.fn(() => true),
  },
}));

import posthog from "posthog-js";
import {
  persistAnalyticsOptOut,
  persistConsentSettings,
  reconcileStoredConsent,
} from "./consent-persist";
import {
  CONSENT_STORAGE_KEY,
  CONSENT_UPDATED_EVENT,
  DEFAULT_CONSENT_SETTINGS,
  fromRecordChoices,
} from "./consent-settings";

describe("persistConsentSettings", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN", "phc_test");
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
    vi.stubGlobal("document", { cookie: "" });
    vi.stubGlobal("window", {
      location: {
        hostname: "localhost",
        protocol: "http:",
        href: "http://localhost/",
      },
      dispatchEvent: vi.fn(),
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("starts replay when Product use is saved on", () => {
    persistConsentSettings(fromRecordChoices({ productUse: true, ads: false }));

    expect(posthog.startSessionRecording).toHaveBeenCalledOnce();
    expect(posthog.stopSessionRecording).not.toHaveBeenCalled();
  });

  it("persists a CCPA-style analytics opt-out", () => {
    persistAnalyticsOptOut();

    expect(posthog.opt_out_capturing).toHaveBeenCalledOnce();
    expect(posthog.stopSessionRecording).toHaveBeenCalledOnce();
  });

  it("stops replay immediately when Product use is saved off", () => {
    persistConsentSettings(fromRecordChoices({ productUse: false, ads: false }));

    expect(posthog.stopSessionRecording).toHaveBeenCalledOnce();
    expect(posthog.startSessionRecording).not.toHaveBeenCalled();
    expect(posthog.opt_out_capturing).toHaveBeenCalledOnce();
  });
});

describe("reconcileStoredConsent", () => {
  const dispatchEvent = vi.fn();
  const storage = new Map<string, string>();

  beforeEach(() => {
    storage.clear();
    dispatchEvent.mockClear();
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN", "phc_test");
    const localStorage = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
    };
    vi.stubGlobal("localStorage", localStorage);
    vi.stubGlobal("document", { cookie: "" });
    vi.stubGlobal("window", {
      location: {
        hostname: "localhost",
        protocol: "http:",
        href: "http://localhost/",
      },
      localStorage,
      dispatchEvent,
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("copies a denied shared cookie and announces the consent change", () => {
    document.cookie = "deltalytix_analytics_consent=denied";

    const settings = reconcileStoredConsent();

    expect(settings).toMatchObject({
      analytics_storage: false,
      ad_storage: false,
    });
    expect(storage.get(CONSENT_STORAGE_KEY)).toContain(
      '"analytics_storage":false',
    );
    expect(dispatchEvent).toHaveBeenCalledOnce();
    expect(dispatchEvent.mock.calls[0]?.[0]).toMatchObject({
      type: CONSENT_UPDATED_EVENT,
      detail: expect.objectContaining({ analytics_storage: false }),
    });
  });

  it("does not announce when localStorage already matches the cookie", () => {
    storage.set(
      CONSENT_STORAGE_KEY,
      JSON.stringify(DEFAULT_CONSENT_SETTINGS),
    );
    document.cookie = "deltalytix_analytics_consent=denied";

    reconcileStoredConsent();

    expect(dispatchEvent).not.toHaveBeenCalled();
  });

  it("announces when the shared cookie overrides a stale local grant", () => {
    storage.set(
      CONSENT_STORAGE_KEY,
      JSON.stringify({
        ...DEFAULT_CONSENT_SETTINGS,
        analytics_storage: true,
      }),
    );
    document.cookie = "deltalytix_analytics_consent=denied";

    reconcileStoredConsent();

    expect(dispatchEvent).toHaveBeenCalledOnce();
    expect(dispatchEvent.mock.calls[0]?.[0]).toMatchObject({
      type: CONSENT_UPDATED_EVENT,
      detail: expect.objectContaining({ analytics_storage: false }),
    });
  });
});
