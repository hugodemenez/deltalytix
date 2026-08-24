import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { DELETE, GET, HEAD, OPTIONS, PATCH, POST, PUT } from "./route";

function request(method: string, url = "https://deltalytix.app/api/does-not-exist") {
  return new NextRequest(new Request(url, { method }));
}

describe("unmatched /api/* routes", () => {
  it("answers GET with a parseable JSON 404, never HTML", async () => {
    const response = await GET(request("GET"));

    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toContain("application/json");

    const body = await response.json();
    expect(body.error.code).toBe("not_found");
    expect(body.error.status).toBe(404);
    expect(body.error.message).toContain("/api/does-not-exist");
    expect(body.error.hint).toContain("/openapi.json");
    expect(body.error.documentation_url).toBe("https://deltalytix.app/docs/api");
  });

  it("answers every method the same way, naming the method", async () => {
    const handlers = {
      POST,
      PUT,
      PATCH,
      DELETE,
      HEAD,
      OPTIONS,
    } as const;

    for (const [method, handler] of Object.entries(handlers)) {
      const response = await handler(request(method));

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error.code).toBe("not_found");
      expect(body.error.message).toContain(method);
    }
  });

  it("is never cached", async () => {
    const response = await GET(request("GET"));

    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
