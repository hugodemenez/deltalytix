import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const rootLayout = fs.readFileSync(
  path.join(process.cwd(), "app/layout.tsx"),
  "utf8",
);

describe("root metadata", () => {
  it("does not pin every page to the homepage canonical", () => {
    expect(rootLayout).not.toMatch(/canonical:\s*siteUrl\(\s*["']\/["']\s*\)/);
    expect(rootLayout).not.toContain('"en-US": siteUrl("/")');
    expect(rootLayout).toContain("getCanonicalOrigin");
  });
});
