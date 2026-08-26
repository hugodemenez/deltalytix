import { describe, expect, it } from "vitest";
import { serverActor, trustedUserId } from "./server-actor";

describe("trusted server actor", () => {
  it("returns the id from an actor minted in-process", () => {
    expect(trustedUserId(serverActor("user_123"))).toBe("user_123");
  });

  it("rejects a plain object, however well shaped", () => {
    expect(trustedUserId({ userId: "victim" })).toBeNull();
    expect(trustedUserId(undefined)).toBeNull();
  });

  it("rejects an actor that has crossed the server-action boundary", () => {
    // React serializes server-action arguments; symbol keys do not survive, so
    // a client replaying a captured payload loses the marker.
    const replayed = JSON.parse(JSON.stringify(serverActor("victim")));

    expect(replayed).toEqual({ userId: "victim" });
    expect(trustedUserId(replayed)).toBeNull();
  });

  it("cannot be forged with a same-named symbol", () => {
    const forged = {
      userId: "victim",
      [Symbol("deltalytix.trusted-actor")]: true,
    };

    expect(trustedUserId(forged)).toBeNull();
  });
});
