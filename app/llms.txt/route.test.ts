import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("GET /llms.txt", () => {
  it("serves the plain-text site index for language models", async () => {
    const response = GET(
      new Request("https://deltalytix.app/llms.txt", {
        headers: { host: "deltalytix.app" },
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/plain; charset=utf-8");

    const body = await response.text();
    expect(body.startsWith("# Deltalytix")).toBe(true);
    expect(body).toContain("https://deltalytix.app/openapi.json");
    expect(body.length).toBeGreaterThan(800);
  });
});
