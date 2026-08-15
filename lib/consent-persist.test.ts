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
  },
}));

import posthog from "posthog-js";
import { persistConsentSettings } from "./consent-persist";
import { fromRecordChoices } from "./consent-settings";

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

  it("stops replay immediately when Product use is saved off", () => {
    persistConsentSettings(fromRecordChoices({ productUse: false, ads: false }));

    expect(posthog.stopSessionRecording).toHaveBeenCalledOnce();
    expect(posthog.startSessionRecording).not.toHaveBeenCalled();
    expect(posthog.opt_out_capturing).toHaveBeenCalledOnce();
  });
});
