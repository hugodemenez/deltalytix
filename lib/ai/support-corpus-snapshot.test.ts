import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  SUPPORT_CORPUS_SNAPSHOT,
  clearCorpusCache,
  collectCorpusSources,
  compareCorpusPaths,
  getCorpus,
} from "./codebase-index";

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const generator = path.join(repoRoot, "scripts/build-support-corpus.ts");

const sample = [
  {
    path: "README.md",
    kind: "doc",
    content: "# Hello\nTradovate oauth connect\n",
  },
];

function snapshotFile(root: string): string {
  return path.join(root, SUPPORT_CORPUS_SNAPSHOT);
}

describe("production support corpus snapshot", () => {
  let root = "";

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), "support-corpus-"));
    await mkdir(path.dirname(snapshotFile(root)), { recursive: true });
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SUPPORT_CORPUS_ROOT", root);
    clearCorpusCache();
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    clearCorpusCache();
    if (root) await rm(root, { recursive: true, force: true });
  });

  it("loads indexed files from the snapshot and caches that result", async () => {
    await writeFile(snapshotFile(root), JSON.stringify(sample));

    const files = await getCorpus();
    expect(files).toHaveLength(1);
    expect(files[0]?.path).toBe("README.md");
    expect(files[0]?.kind).toBe("doc");
    expect(files[0]?.title).toBe("Hello");
    expect(files[0]?.lowerContent).toContain("tradovate");

    await writeFile(snapshotFile(root), JSON.stringify([]));
    const cached = await getCorpus();
    expect(cached).toHaveLength(1);
    expect(cached[0]?.path).toBe("README.md");
  });

  it("does not cache a missing snapshot", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect(await getCorpus()).toEqual([]);
      expect(
        error.mock.calls.some((args) => String(args[0]).includes("missing or unreadable")),
      ).toBe(true);

      await writeFile(snapshotFile(root), JSON.stringify(sample));
      const recovered = await getCorpus();
      expect(recovered).toHaveLength(1);
      expect(recovered[0]?.title).toBe("Hello");
    } finally {
      error.mockRestore();
    }
  });

  it("does not cache an empty snapshot", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      await writeFile(snapshotFile(root), "[]");
      expect(await getCorpus()).toEqual([]);
      expect(error.mock.calls.some((args) => String(args[0]).includes("snapshot is empty"))).toBe(
        true,
      );

      await writeFile(snapshotFile(root), JSON.stringify(sample));
      const recovered = await getCorpus();
      expect(recovered).toHaveLength(1);
    } finally {
      error.mockRestore();
    }
  });

  it("does not cache an invalid snapshot", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      await writeFile(snapshotFile(root), "{");
      expect(await getCorpus()).toEqual([]);
      expect(error.mock.calls.some((args) => String(args[0]).includes("snapshot is invalid"))).toBe(
        true,
      );

      await writeFile(snapshotFile(root), JSON.stringify(sample));
      const recovered = await getCorpus();
      expect(recovered).toHaveLength(1);
    } finally {
      error.mockRestore();
    }
  });
});

describe("corpus path order", () => {
  it("orders paths by UTF-8 bytes", () => {
    expect(compareCorpusPaths("a", "a")).toBe(0);
    expect(compareCorpusPaths("A", "a")).toBeLessThan(0);
    expect(compareCorpusPaths("é", "f")).toBeGreaterThan(0);
    expect(compareCorpusPaths("lib/a.ts", "lib/b.ts")).toBeLessThan(0);
  });

  it("reads the provided root instead of the working directory", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "support-corpus-root-"));
    try {
      await mkdir(path.join(root, "lib"), { recursive: true });
      await writeFile(path.join(root, "README.md"), "# Root\n");
      await writeFile(path.join(root, "lib/b.ts"), "export const b = 1;\n");
      await writeFile(path.join(root, "lib/a.ts"), "export const a = 1;\n");

      const files = await collectCorpusSources(root);
      expect(files.map((file) => file.path)).toEqual(["README.md", "lib/a.ts", "lib/b.ts"]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe("support corpus generator", () => {
  it("exits non-zero below the minimum and does not write a snapshot", () => {
    const source = readFileSync(generator, "utf8");
    expect(source).toContain("fileURLToPath");
    expect(source).not.toContain("process.cwd");

    const root = mkdtempSync(path.join(tmpdir(), "support-corpus-gen-"));
    try {
      const result = spawnSync("bun", [generator], {
        cwd: tmpdir(),
        env: { ...process.env, SUPPORT_CORPUS_ROOT: root },
        encoding: "utf8",
      });

      expect(result.status).not.toBe(0);
      expect(result.stdout).toMatch(/\[support-corpus\] 0 files, 0\.00 MB/);
      expect(result.stderr).toMatch(/below the minimum/);
      expect(existsSync(path.join(root, SUPPORT_CORPUS_SNAPSHOT))).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
