import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import proxy from "./proxy";

function homepageRequest(headers: Record<string, string>) {
  return new NextRequest(
    new Request("https://deltalytix.app/", {
      headers: { host: "deltalytix.app", ...headers },
    }),
  );
}

describe("homepage markdown negotiation", () => {
  it("serves text/markdown when the agent asks for it", async () => {
    const response = await proxy(
      homepageRequest({ accept: "text/markdown, text/html;q=0.5" }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe(
      "text/markdown; charset=utf-8",
    );
    await expect(response.text()).resolves.toContain("# Deltalytix");
  });

  it("varies on Accept so a CDN cannot serve the wrong representation", async () => {
    const response = await proxy(homepageRequest({ accept: "text/markdown" }));

    const vary = response.headers.get("vary") ?? "";
    expect(vary.toLowerCase().split(/,\s*/)).toContain("accept");
    expect(vary.toLowerCase()).toContain("accept-encoding");
  });

  it("keeps the discovery Link header on the markdown representation", async () => {
    const response = await proxy(homepageRequest({ accept: "text/markdown" }));

    expect(response.headers.get("link")).toContain('rel="api-catalog"');
    expect(response.headers.get("link")).toContain("/llms.txt");
  });

  it("adds Accept to Vary on the HTML representation too", async () => {
    const response = await proxy(
      homepageRequest({ accept: "text/html,application/xhtml+xml" }),
    );

    const vary = response.headers.get("vary") ?? "";
    expect(vary.toLowerCase().split(/,\s*/)).toContain("accept");
    expect(response.headers.get("content-type")).not.toBe(
      "text/markdown; charset=utf-8",
    );
  });
});
