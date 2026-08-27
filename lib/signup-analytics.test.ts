import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  USER_SIGNED_UP_EVENT,
  buildUserSignedUpCapture,
  userSignedUpInsertId,
} from "./signup-analytics";

describe("buildUserSignedUpCapture", () => {
  it("keeps the existing event name and skips the consent cookie gate", () => {
    const capture = buildUserSignedUpCapture({
      distinctId: "auth-user-1",
      properties: { method: "google", language: "en" },
    });

    expect(capture.event).toBe(USER_SIGNED_UP_EVENT);
    expect(capture.event).toBe("user_signed_up");
    expect(capture.consentGranted).toBe(true);
    expect(capture.distinctId).toBe("auth-user-1");
    expect(capture.properties.method).toBe("google");
    expect(capture.properties.language).toBe("en");
  });

  it("pins $insert_id to the auth user so a retry cannot double-count", () => {
    const first = buildUserSignedUpCapture({ distinctId: "auth-user-1" });
    const retry = buildUserSignedUpCapture({
      distinctId: "auth-user-1",
      properties: { method: "email" },
    });

    expect(first.properties.$insert_id).toBe("user_signed_up:auth-user-1");
    expect(retry.properties.$insert_id).toBe(userSignedUpInsertId("auth-user-1"));
    expect(retry.properties.$insert_id).toBe(first.properties.$insert_id);
  });

  it("does not let caller properties override $insert_id", () => {
    const capture = buildUserSignedUpCapture({
      distinctId: "auth-user-1",
      properties: { $insert_id: "forged" },
    });

    expect(capture.properties.$insert_id).toBe("user_signed_up:auth-user-1");
  });
});

describe("ensureUserInDatabase signup capture hook", () => {
  const source = readFileSync(new URL("../server/auth.ts", import.meta.url), "utf8");

  it("fires user_signed_up only after the public User row is created", () => {
    const createIdx = source.indexOf("const newUser = await prisma.user.create");
    const captureIdx = source.indexOf(
      "await capturePostHogEvent(buildUserSignedUpCapture",
    );
    const existingReturnIdx = source.indexOf(
      "return { user: existingUserByAuthId, isNewUser: false }",
    );

    expect(createIdx).toBeGreaterThan(-1);
    expect(captureIdx).toBeGreaterThan(createIdx);
    expect(existingReturnIdx).toBeGreaterThan(-1);
    expect(existingReturnIdx).toBeLessThan(captureIdx);
  });
});
