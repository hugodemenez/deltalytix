import { describe, expect, it } from "vitest";
import { ALLOWED_AGENT_USER_AGENTS } from "@/lib/agent-discovery/robots";
import { GET } from "./route";

describe("GET /robots.txt", () => {
  it("serves plain text with the explicit agent groups", async () => {
    const response = GET(
      new Request("https://deltalytix.app/robots.txt", {
        headers: { host: "deltalytix.app" },
      }),
    );

    expect(response.headers.get("content-type")).toBe("text/plain; charset=utf-8");

    const body = await response.text();
    for (const userAgent of ALLOWED_AGENT_USER_AGENTS) {
      expect(body).toContain(`User-agent: ${userAgent}`);
    }
    expect(body).toContain("Sitemap: https://deltalytix.app/sitemap.xml");
  });
});
