import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const capture = vi.fn();
const flush = vi.fn();
const shutdown = vi.fn();

vi.mock("posthog-node", () => ({
  PostHog: class {
    capture = capture;
    flush = flush;
    shutdown = shutdown;
  },
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: () => undefined,
  })),
  headers: vi.fn(async () => new Headers({ "x-user-country": "FR" })),
}));

import { cookies, headers } from "next/headers";
import { capturePostHogEvent, shutdownPostHog } from "./posthog-server";

describe("capturePostHogEvent", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN", "phc_test");
    capture.mockReset();
    flush.mockReset();
    shutdown.mockReset();
    flush.mockResolvedValue(undefined);
    shutdown.mockResolvedValue(undefined);
    vi.mocked(cookies).mockResolvedValue({
      get: () => undefined,
    } as never);
    vi.mocked(headers).mockResolvedValue(
      new Headers({ "x-user-country": "FR" }),
    );
  });

  it("captures conversion events without the analytics cookie and flushes", async () => {
    const accepted = await capturePostHogEvent({
      skipConsent: true,
      distinctId: "user-1",
      event: "checkout_started",
      country: "FR",
      properties: {
        plan: "PRO",
        email: "hidden@example.com",
        $insert_id: "checkout_started:cs_1",
      },
    });

    expect(accepted).toBe(true);
    expect(capture).toHaveBeenCalledOnce();
    expect(capture.mock.calls[0][0].distinctId).toBe("user-1");
    expect(capture.mock.calls[0][0].event).toBe("checkout_started");
    expect(capture.mock.calls[0][0].properties.email).toBeUndefined();
    expect(capture.mock.calls[0][0].properties.plan).toBe("PRO");
    expect(flush).toHaveBeenCalledOnce();
  });

  it("drops non-conversion events when EU consent is missing", async () => {
    const accepted = await capturePostHogEvent({
      distinctId: "user-1",
      event: "connection_created",
    });

    expect(accepted).toBe(false);
    expect(capture).not.toHaveBeenCalled();
  });

  it("shuts down the serverless client so the last event is not lost", async () => {
    await capturePostHogEvent({
      skipConsent: true,
      distinctId: "user-1",
      event: "user_signed_up",
    });
    await shutdownPostHog();

    expect(shutdown).toHaveBeenCalledOnce();
  });

  it("strips email on US conversions when the analytics cookie is denied", async () => {
    vi.mocked(cookies).mockResolvedValueOnce({
      get: (name?: string) =>
        name === "deltalytix_analytics_consent"
          ? { value: "denied" }
          : undefined,
    } as never);
    vi.mocked(headers).mockResolvedValueOnce(
      new Headers({ "x-user-country": "US" }),
    );

    await capturePostHogEvent({
      skipConsent: true,
      distinctId: "user-1",
      event: "checkout_started",
      country: "US",
      properties: { email: "a@b.com", plan: "PRO" },
    });

    expect(capture.mock.calls[0][0].properties.email).toBeUndefined();
    expect(capture.mock.calls[0][0].properties.plan).toBe("PRO");
  });

  it("keeps a passed email for US conversions when analytics is not denied", async () => {
    await capturePostHogEvent({
      skipConsent: true,
      distinctId: "user-1",
      event: "checkout_started",
      country: "US",
      properties: { email: "a@b.com", plan: "PRO" },
    });

    expect(capture.mock.calls[0][0].properties.email).toBe("a@b.com");
  });
});
