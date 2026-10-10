import { describe, expect, it } from "vitest";
import { serverActor, trustedUserId, type TrustedActor } from "./server-actor";

/** A server action's arguments are whatever the client sent, not what the type says. */
function fromTheWire(value: unknown) {
  return trustedUserId(value as TrustedActor | undefined);
}

describe("trusted server actor", () => {
  it("returns the id from an actor minted in-process", () => {
    expect(trustedUserId(serverActor("user_123"))).toBe("user_123");
  });

  it("survives being spread into a wider options object", () => {
    const options = { ...serverActor("user_123"), accountId: "DEMO-001" };

    expect(trustedUserId(options)).toBe("user_123");
  });

  it("rejects a plain object, however well shaped", () => {
    // `{ userId }` is also a compile error against TrustedActor — this covers
    // the untyped path a server action actually receives.
    expect(fromTheWire({ userId: "victim" })).toBeNull();
    expect(fromTheWire(undefined)).toBeNull();
    expect(fromTheWire(null)).toBeNull();
  });

  it("rejects an actor that has crossed the server-action boundary", () => {
    // React serializes server-action arguments; symbol keys do not survive, so
    // a client replaying a captured payload loses the marker.
    const replayed = JSON.parse(JSON.stringify(serverActor("victim")));

    expect(replayed).toEqual({});
    expect(fromTheWire(replayed)).toBeNull();
  });

  it("cannot be forged with a same-named symbol", () => {
    const forged = { [Symbol("deltalytix.trusted-actor")]: { userId: "victim" } };

    expect(fromTheWire(forged)).toBeNull();
  });
});
