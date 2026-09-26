import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  POSTHOG_ASSETS_HOST,
  POSTHOG_INGEST_PATH,
  POSTHOG_UI_HOST,
  buildPostHogBrowserInitConfig,
  shouldStartSessionRecording,
} from "./posthog-browser-config";

describe("buildPostHogBrowserInitConfig", () => {
  it("uses cookieless on_reject + memory persistence for EU visitors before consent", () => {
    const config = buildPostHogBrowserInitConfig({
      identifiedConsent: false,
      requiresCookieConsent: true,
    });

    expect(config.api_host).toBe(POSTHOG_INGEST_PATH);
    expect(config.ui_host).toBe(POSTHOG_UI_HOST);
    expect(config.cookieless_mode).toBe("on_reject");
    expect(config.opt_out_capturing_by_default).toBe(true);
    expect(config.persistence).toBe("memory");
    expect(config.disable_session_recording).toBe(true);
    expect(config.session_recording.maskAllInputs).toBe(true);
    expect(config.capture_pageview).toBe(true);
    expect(config.autocapture).toBe(false);
  });

  it("switches to identified tracking and masked replay after EU consent", () => {
    const config = buildPostHogBrowserInitConfig({
      identifiedConsent: true,
      requiresCookieConsent: true,
    });

    expect(config.cookieless_mode).toBeUndefined();
    expect(config.opt_out_capturing_by_default).toBe(false);
    expect(config.persistence).toBeUndefined();
    expect(config.disable_session_recording).toBe(false);
    expect(config.session_recording.maskAllInputs).toBe(true);
  });

  it("captures with cookies by default for US visitors and still masks replay", () => {
    const config = buildPostHogBrowserInitConfig({
      identifiedConsent: true,
      requiresCookieConsent: false,
    });

    expect(config.cookieless_mode).toBeUndefined();
    expect(config.opt_out_capturing_by_default).toBe(false);
    expect(config.disable_session_recording).toBe(false);
    expect(config.session_recording.maskAllInputs).toBe(true);
  });
});

describe("shouldStartSessionRecording", () => {
  it("starts replay only with identified consent", () => {
    expect(shouldStartSessionRecording(true)).toBe(true);
    expect(shouldStartSessionRecording(false)).toBe(false);
  });
});

describe("ingest proxy wiring", () => {
  it("points next.config rewrites at the EU ingest and assets hosts", () => {
    const source = readFileSync(new URL("../next.config.ts", import.meta.url), "utf8");

    expect(source).toContain('source: "/ingest/static/:path*"');
    expect(source).toContain(`destination: "${POSTHOG_ASSETS_HOST}/static/:path*"`);
    expect(source).toContain('source: "/ingest/:path*"');
    expect(source).toMatch(/eu\.i\.posthog\.com\/:path\*/);
    expect(source).toMatch(/skipTrailingSlashRedirect:\s*true/);
  });

  it("excludes /ingest from the proxy matcher so rewrites are not intercepted", () => {
    const source = readFileSync(new URL("../proxy.ts", import.meta.url), "utf8");
    expect(source).toMatch(/ingest/);
  });
});
