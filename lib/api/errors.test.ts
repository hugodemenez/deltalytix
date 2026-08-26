import { describe, expect, it } from "vitest";
import { apiError, insufficientScope, oauthError, unauthorized } from "./errors";

async function body(response: Response) {
  return (await response.json()) as {
    error: Record<string, unknown>;
  };
}

describe("/api/v1 errors", () => {
  it("uses the same envelope as the rest of /api/*", async () => {
    const response = apiError(400, "validation_error", "Invalid trade data");

    expect(response.status).toBe(400);
    expect((await body(response)).error).toMatchObject({
      code: "bad_request",
      message: "Invalid trade data",
      status: 400,
    });
  });

  it("turns the call site's slug into an actionable hint", async () => {
    const { error } = await body(
      apiError(422, "unsupported_service", "Unsupported service"),
    );

    expect(error.code).toBe("unprocessable_entity");
    expect(String(error.hint)).toContain("ibkr");
  });

  it("keeps field-level detail and drops anything not shaped like it", async () => {
    const withDetails = await body(
      apiError(400, "validation_error", "Invalid trade data", [
        { field: "pnl", message: "must be a number" },
      ]),
    );
    const withJunk = await body(
      apiError(400, "validation_error", "Invalid trade data", "nope"),
    );

    expect(withDetails.error.details).toEqual([
      { field: "pnl", message: "must be a number" },
    ]);
    expect(withJunk.error.details).toBeUndefined();
  });

  it("points an unauthenticated caller at the protected-resource metadata", async () => {
    const response = unauthorized(
      "Missing access token",
      new Request("https://deltalytix.app/api/v1/me"),
    );

    expect(response.status).toBe(401);
    expect(response.headers.get("WWW-Authenticate")).toContain(
      "/.well-known/oauth-protected-resource",
    );
    expect((await body(response)).error.code).toBe("unauthorized");
  });

  it("names the scopes that would have satisfied a 403", async () => {
    const { error } = await body(
      insufficientScope("Token is missing required scopes", ["trades:write"]),
    );

    expect(error.code).toBe("forbidden");
    expect(error.required_scopes).toEqual(["trades:write"]);
  });

  it("leaves the OAuth endpoints on the RFC 6749 error shape", async () => {
    const response = oauthError(400, "invalid_grant", "Expired code");

    expect(await response.json()).toEqual({
      error: "invalid_grant",
      error_description: "Expired code",
    });
  });
});
