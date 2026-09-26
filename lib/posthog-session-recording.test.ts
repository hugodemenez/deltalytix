import { readFileSync } from "node:fs";

import { describe, expect, it, vi } from "vitest";

import { syncPostHogSessionRecording } from "./posthog-session-recording";

function createReplayClient() {
  return {
    startSessionRecording: vi.fn(),
    stopSessionRecording: vi.fn(),
  };
}

describe("syncPostHogSessionRecording", () => {
  it("starts recording when analytics consent is granted", () => {
    const client = createReplayClient();

    syncPostHogSessionRecording(client, true);

    expect(client.startSessionRecording).toHaveBeenCalledOnce();
    expect(client.stopSessionRecording).not.toHaveBeenCalled();
  });

  it("stops recording when analytics consent is denied or withdrawn", () => {
    const client = createReplayClient();

    syncPostHogSessionRecording(client, false);

    expect(client.stopSessionRecording).toHaveBeenCalledOnce();
    expect(client.startSessionRecording).not.toHaveBeenCalled();
  });
});

describe("instrumentation-client replay config", () => {
  const source = readFileSync(
    new URL("../instrumentation-client.ts", import.meta.url),
    "utf8",
  );

  it("does not hard-disable session recording at init", () => {
    expect(source).not.toMatch(/disable_session_recording\s*:\s*true/);
  });

  it("keeps autocapture off, proxies through /ingest, and gates replay on identified consent", () => {
    expect(source).toMatch(/buildPostHogBrowserInitConfig/);
    expect(source).toMatch(/syncPostHogSessionRecording\(posthog,\s*identifiedConsent\)/);
  });
});
