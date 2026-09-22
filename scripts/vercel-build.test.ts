import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const script = path.join(path.dirname(fileURLToPath(import.meta.url)), "vercel-build.sh");

function plan(commitRef: string | undefined): string {
  const env = { ...process.env };
  if (commitRef === undefined) {
    delete env.VERCEL_GIT_COMMIT_REF;
  } else {
    env.VERCEL_GIT_COMMIT_REF = commitRef;
  }

  return execFileSync("bash", [script, "--plan"], {
    encoding: "utf8",
    env,
  });
}

describe("vercel-build migrate gate", () => {
  it("always generates the Prisma client and runs next build", () => {
    const out = plan("cursor/preview-c4fb");
    const lines = out.trim().split("\n");
    expect(lines[0]).toBe("prisma generate");
    expect(lines.at(-1)).toBe("next build");
  });

  it("runs migrate deploy on beta", () => {
    expect(plan("beta")).toBe(
      "prisma generate\nprisma migrate deploy\nnext build\n",
    );
  });

  it("runs migrate deploy on main", () => {
    expect(plan("main")).toBe(
      "prisma generate\nprisma migrate deploy\nnext build\n",
    );
  });

  it("treats refs/heads/beta as beta", () => {
    expect(plan("refs/heads/beta")).toContain("prisma migrate deploy\n");
    expect(plan("refs/heads/beta")).not.toContain("skip");
  });

  it("skips migrate deploy on Preview feature branches", () => {
    expect(plan("cursor/vercel-prisma-migrate-hook-c4fb")).toBe(
      "prisma generate\nskip prisma migrate deploy\nnext build\n",
    );
  });

  it("skips migrate deploy when the git ref is unset (local builds)", () => {
    expect(plan(undefined)).toBe(
      "prisma generate\nskip prisma migrate deploy\nnext build\n",
    );
  });
});
