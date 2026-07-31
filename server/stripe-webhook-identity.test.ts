import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { PrismaClient } from "@/prisma/generated/prisma/client";

import { readUserIdMetadata, resolveLocalUser } from "./stripe-webhook-identity";

type UserRow = { id: string; email: string; auth_user_id: string };

const findUnique = vi.fn();

/**
 * Stands in for prisma.user. The webhook only ever reads through the three
 * unique keys, so matching on whichever one is present is enough.
 */
function givenUsers(users: UserRow[]) {
  findUnique.mockImplementation(({ where }: { where: Partial<UserRow> }) => {
    const match = users.find(
      (user) =>
        (where.auth_user_id !== undefined && user.auth_user_id === where.auth_user_id) ||
        (where.id !== undefined && user.id === where.id) ||
        (where.email !== undefined && user.email === where.email),
    );

    return Promise.resolve(match ? { id: match.id, email: match.email } : null);
  });
}

const prisma = { user: { findUnique } } as unknown as PrismaClient;

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("readUserIdMetadata", () => {
  it("takes the first user_id across the sources in order", () => {
    expect(
      readUserIdMetadata({ user_id: "from-session" }, { user_id: "from-customer" }),
    ).toBe("from-session");
  });

  it("falls through empty and absent metadata bags", () => {
    expect(readUserIdMetadata(null, {}, { user_id: "from-customer" })).toBe(
      "from-customer",
    );
  });

  it("returns null when no source carries the key", () => {
    expect(readUserIdMetadata(null, undefined, { plan: "plus" })).toBeNull();
  });
});

describe("resolveLocalUser", () => {
  it("resolves metadata against auth_user_id", async () => {
    givenUsers([
      { id: "prisma-id", email: "user@example.com", auth_user_id: "auth-id" },
    ]);

    await expect(
      resolveLocalUser(prisma, { metadataUserId: "auth-id" }),
    ).resolves.toEqual({ id: "prisma-id", email: "user@example.com" });
  });

  it("falls back to User.id for legacy rows where the ids diverge", async () => {
    givenUsers([
      { id: "shared-id", email: "user@example.com", auth_user_id: "other-auth-id" },
    ]);

    await expect(
      resolveLocalUser(prisma, { metadataUserId: "shared-id" }),
    ).resolves.toEqual({ id: "shared-id", email: "user@example.com" });
  });

  it("resolves by email when no metadata is present, for pre-metadata events", async () => {
    givenUsers([
      { id: "prisma-id", email: "legacy@example.com", auth_user_id: "auth-id" },
    ]);

    await expect(
      resolveLocalUser(prisma, { email: "legacy@example.com" }),
    ).resolves.toEqual({ id: "prisma-id", email: "legacy@example.com" });
  });

  it("does not fall back to email when metadata is present but unresolvable", async () => {
    // The address was reused by another account after the original was deleted.
    givenUsers([
      { id: "new-owner", email: "reused@example.com", auth_user_id: "new-auth-id" },
    ]);

    await expect(
      resolveLocalUser(prisma, {
        metadataUserId: "deleted-account",
        email: "reused@example.com",
      }),
    ).resolves.toBeNull();
  });

  it("prefers metadata over an email that points at a different account", async () => {
    givenUsers([
      { id: "owner", email: "owner@example.com", auth_user_id: "owner-auth-id" },
      { id: "other", email: "stale@example.com", auth_user_id: "other-auth-id" },
    ]);

    await expect(
      resolveLocalUser(prisma, {
        metadataUserId: "owner-auth-id",
        email: "stale@example.com",
      }),
    ).resolves.toEqual({ id: "owner", email: "owner@example.com" });
  });

  it("returns null when neither metadata nor email is available", async () => {
    givenUsers([]);

    await expect(resolveLocalUser(prisma, {})).resolves.toBeNull();
    expect(findUnique).not.toHaveBeenCalled();
  });
});
