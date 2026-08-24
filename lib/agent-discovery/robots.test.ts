import { describe, expect, it } from "vitest";
import {
  ALLOWED_AGENT_USER_AGENTS,
  buildRobotsTxt,
  CONTENT_SIGNAL,
  DISALLOWED_PATHS,
} from "./robots";

const robots = buildRobotsTxt("https://deltalytix.app");

/** robots.txt groups: `User-agent` lines followed by their rules. */
function groups(body: string) {
  const parsed = new Map<string, string[]>();
  let current: string[] | null = null;

  for (const rawLine of body.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const [field, ...rest] = line.split(":");
    const value = rest.join(":").trim();

    if (field.toLowerCase() === "user-agent") {
      current = [];
      parsed.set(value, current);
      continue;
    }

    current?.push(`${field}: ${value}`);
  }

  return parsed;
}

describe("robots.txt", () => {
  it("keeps the wildcard group allowing the public site", () => {
    const wildcard = groups(robots).get("*");

    expect(wildcard).toBeDefined();
    expect(wildcard).toContain("Allow: /");
    expect(wildcard).toContain(`Content-Signal: ${CONTENT_SIGNAL}`);
  });

  it("gives every welcomed AI agent an explicit group", () => {
    const parsed = groups(robots);

    for (const userAgent of ALLOWED_AGENT_USER_AGENTS) {
      expect(parsed.has(userAgent), `${userAgent} has no group`).toBe(true);
      expect(parsed.get(userAgent)).toContain("Allow: /");
    }
  });

  it("covers the agents the readiness audit probes", () => {
    for (const userAgent of [
      "ChatGPT-User",
      "ClaudeBot",
      "Google-Extended",
      "ora-agent",
      "DeepSeekBot",
    ]) {
      expect(ALLOWED_AGENT_USER_AGENTS).toContain(userAgent);
    }
  });

  it("repeats the private-area disallows in every group, because groups do not inherit", () => {
    for (const [userAgent, rules] of groups(robots)) {
      for (const path of DISALLOWED_PATHS) {
        expect(rules, `${userAgent} is missing Disallow: ${path}`).toContain(
          `Disallow: ${path}`,
        );
      }
    }
  });

  it("repeats the content signal in every group, for the same reason", () => {
    // A named group makes the crawler ignore `*`, so a signal declared only
    // there would never reach GPTBot, ClaudeBot, Google-Extended, and friends.
    for (const [userAgent, rules] of groups(robots)) {
      expect(rules, `${userAgent} is missing the content signal`).toContain(
        `Content-Signal: ${CONTENT_SIGNAL}`,
      );
    }
  });

  it("does not welcome training-only crawlers while ai-train=no", () => {
    expect(CONTENT_SIGNAL).toContain("ai-train=no");
    expect(ALLOWED_AGENT_USER_AGENTS).not.toContain("CCBot");
  });

  it("points at the sitemap and llms.txt on the requested origin", () => {
    expect(robots).toContain("Sitemap: https://deltalytix.app/sitemap.xml");
    expect(robots).toContain("https://deltalytix.app/llms.txt");
    expect(buildRobotsTxt("https://www.deltalytix.app")).toContain(
      "Sitemap: https://www.deltalytix.app/sitemap.xml",
    );
  });

  it("never lists the same user-agent twice", () => {
    const names = [...robots.matchAll(/^User-agent: (.+)$/gm)].map((m) => m[1]);

    expect(new Set(names).size).toBe(names.length);
  });
});
