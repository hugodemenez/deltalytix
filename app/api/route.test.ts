import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { scopeNames } from "@/lib/agent-discovery/metadata";
import { GET } from "./route";

describe("GET /api", () => {
  it("returns JSON status with discovery links and supported scopes", async () => {
    const response = await GET(
      new NextRequest(new Request("https://deltalytix.app/api")),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");

    const body = await response.json();
    expect(body.status).toBe("ok");
    expect(body.documentation_url).toBe("https://deltalytix.app/docs/api");
    expect(body.openapi_url).toBe("https://deltalytix.app/openapi.json");
    expect(body.scopes_supported).toEqual(scopeNames());
  });
});
