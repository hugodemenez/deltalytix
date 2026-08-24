import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  acceptsMarkdown,
  AGENT_RESOURCES,
  AGENT_SCOPES,
  CONTENT_NEGOTIATION_VARY,
  deltalytixSkillDigest,
  deltalytixSkillMarkdown,
  homepageMarkdown,
  linkHeaderValue,
  llmsTxt,
  mergeVary,
  notFoundMarkdown,
  READ_ONLY_SCOPES,
  scopeMap,
  scopeNames,
} from "./metadata";

const request = new Request("https://deltalytix.app/");

describe("agent scopes", () => {
  it("exposes every scope with a description", () => {
    expect(AGENT_SCOPES.length).toBeGreaterThan(0);
    for (const scope of AGENT_SCOPES) {
      expect(scope.name).toMatch(/^[a-z]+(:[a-z]+)?$/);
      expect(scope.description.length).toBeGreaterThan(20);
    }
  });

  it("keeps scope names and the scope map in sync", () => {
    expect(Object.keys(scopeMap())).toEqual(scopeNames());
  });

  it("advertises read-only scopes that are all real scopes", () => {
    expect(READ_ONLY_SCOPES.length).toBeGreaterThan(0);
    for (const scope of READ_ONLY_SCOPES) {
      expect(scopeNames()).toContain(scope);
      expect(scope.endsWith(":read")).toBe(true);
    }
  });

  it("covers read and write access to trades and journal", () => {
    expect(scopeNames()).toEqual(
      expect.arrayContaining([
        "trades:read",
        "trades:write",
        "journal:read",
        "journal:write",
        "analytics:read",
      ]),
    );
  });
});

describe("markdown content negotiation", () => {
  it("detects an explicit text/markdown request", () => {
    expect(acceptsMarkdown("text/markdown")).toBe(true);
    expect(acceptsMarkdown("text/markdown;q=0.9, text/html;q=0.8")).toBe(true);
    expect(acceptsMarkdown("text/html, text/markdown")).toBe(true);
    expect(acceptsMarkdown("TEXT/MARKDOWN")).toBe(true);
  });

  it("ignores clients that did not ask for markdown", () => {
    expect(acceptsMarkdown("text/html,application/xhtml+xml")).toBe(false);
    expect(acceptsMarkdown("*/*")).toBe(false);
    expect(acceptsMarkdown(null)).toBe(false);
    expect(acceptsMarkdown(undefined)).toBe(false);
  });

  it("varies on Accept so a CDN cannot cross the two representations", () => {
    expect(CONTENT_NEGOTIATION_VARY).toBe("Accept, Accept-Encoding");
  });

  it("merges Accept into an existing Vary without dropping or duplicating tokens", () => {
    expect(mergeVary("rsc, next-router-state-tree")).toBe(
      "rsc, next-router-state-tree, Accept, Accept-Encoding",
    );
    expect(mergeVary(null)).toBe("Accept, Accept-Encoding");
    expect(mergeVary("")).toBe("Accept, Accept-Encoding");
    expect(mergeVary("accept")).toBe("accept, Accept-Encoding");
    expect(mergeVary("Accept, Accept-Encoding")).toBe("Accept, Accept-Encoding");
  });
});

describe("link header", () => {
  it("advertises the API catalog, service description, llms.txt, and sitemap", () => {
    const value = linkHeaderValue();

    expect(value).toContain('rel="api-catalog"');
    expect(value).toContain('rel="service-desc"');
    expect(value).toContain('rel="service-doc"');
    expect(value).toContain('</llms.txt>; rel="alternate"; type="text/plain"');
    expect(value).toContain('</sitemap.xml>; rel="sitemap"');
  });
});

describe("agent resources", () => {
  it("lists the sitemap, llms.txt, and the docs index", () => {
    const paths = AGENT_RESOURCES.map((resource) => resource.path);

    expect(paths).toContain("/sitemap.xml");
    expect(paths).toContain("/llms.txt");
    expect(paths).toContain("/docs/api");
    expect(paths).toContain("/openapi.json");
  });

  it("uses root-relative paths only", () => {
    for (const resource of AGENT_RESOURCES) {
      expect(resource.path.startsWith("/")).toBe(true);
      expect(resource.description.length).toBeGreaterThan(10);
    }
  });
});

describe("homepage markdown", () => {
  it("keeps an H1, capabilities, and absolute discovery links", () => {
    const markdown = homepageMarkdown(request);

    expect(markdown.startsWith("# Deltalytix")).toBe(true);
    expect(markdown).toContain("https://deltalytix.app/llms.txt");
    expect(markdown).toContain("https://deltalytix.app/sitemap.xml");
    expect(markdown).toContain("trades:read");
    expect(markdown.length).toBeGreaterThan(500);
  });
});

describe("404 markdown", () => {
  it("names the missing path and points at the machine-readable entry points", () => {
    const markdown = notFoundMarkdown("/nope", request);

    expect(markdown.startsWith("# 404 — Not found")).toBe(true);
    expect(markdown).toContain("`/nope`");
    expect(markdown).toContain("https://deltalytix.app/sitemap.xml");
    expect(markdown).toContain("https://deltalytix.app/llms.txt");
    expect(markdown).toContain("https://deltalytix.app/docs/api");
  });

  it("stays valid without a path", () => {
    const markdown = notFoundMarkdown(undefined, request);

    expect(markdown).toContain("The requested path does not exist");
    expect(markdown).not.toContain("undefined");
  });
});

describe("llms.txt", () => {
  it("follows the llms.txt shape: H1, blockquote summary, link sections", () => {
    const body = llmsTxt(request);
    const lines = body.split("\n");

    expect(lines[0]).toBe("# Deltalytix");
    expect(lines[2].startsWith("> ")).toBe(true);
    expect(body).toContain("## Product");
    expect(body).toContain("## For agents and developers");
    expect(body).toContain("## Authentication and scopes");
  });

  it("links every product page absolutely and lists every scope", () => {
    const body = llmsTxt(request);

    expect(body).toContain("(https://deltalytix.app/pricing)");
    expect(body).toContain("(https://deltalytix.app/updates)");
    expect(body).toContain("(https://deltalytix.app/openapi.json)");
    for (const scope of scopeNames()) {
      expect(body).toContain(`\`${scope}\``);
    }
  });

  it("never leaks a relative link", () => {
    const body = llmsTxt(request);
    const links = [...body.matchAll(/\]\(([^)]+)\)/g)].map((match) => match[1]);

    expect(links.length).toBeGreaterThan(10);
    for (const link of links) {
      expect(link.startsWith("https://")).toBe(true);
    }
  });
});

describe("published agent skill", () => {
  it("keeps the advertised digest in sync with the markdown", () => {
    const digest = createHash("sha256")
      .update(deltalytixSkillMarkdown)
      .digest("hex");

    expect(deltalytixSkillDigest).toBe(`sha256:${digest}`);
  });
});
