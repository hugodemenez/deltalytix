import type { Dirent } from "node:fs";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

export type CorpusKind = "doc" | "locale" | "source" | "schema";

/** Tool-facing corpus slices — `source` is the live product behaviour. */
export type CorpusScope = "all" | "source" | "docs" | "product";

type CorpusRoot = {
  /** Repo-relative directory or file. */
  path: string;
  kind: CorpusKind;
  /** Extensions accepted when walking a directory. */
  extensions: readonly string[];
};

const DOC_EXTENSIONS = [".md", ".mdx"] as const;
const SOURCE_EXTENSIONS = [".ts", ".tsx", ".js", ".mjs"] as const;

/**
 * In-memory clone of the product surface the support agent may search.
 * Source trees are first-class: docs alone cannot explain runtime behaviour.
 */
export const CORPUS_ROOTS: readonly CorpusRoot[] = [
  { path: "content", kind: "doc", extensions: DOC_EXTENSIONS },
  { path: "README.md", kind: "doc", extensions: DOC_EXTENSIONS },
  { path: "SELF_HOSTING.md", kind: "doc", extensions: DOC_EXTENSIONS },
  { path: "SECURITY.md", kind: "doc", extensions: DOC_EXTENSIONS },
  { path: "AGENTS.md", kind: "doc", extensions: DOC_EXTENSIONS },
  { path: "locales", kind: "locale", extensions: SOURCE_EXTENSIONS },
  { path: "app", kind: "source", extensions: [...SOURCE_EXTENSIONS, ...DOC_EXTENSIONS] },
  { path: "components", kind: "source", extensions: SOURCE_EXTENSIONS },
  { path: "lib", kind: "source", extensions: SOURCE_EXTENSIONS },
  { path: "server", kind: "source", extensions: SOURCE_EXTENSIONS },
  { path: "hooks", kind: "source", extensions: SOURCE_EXTENSIONS },
  { path: "store", kind: "source", extensions: SOURCE_EXTENSIONS },
  { path: "context", kind: "source", extensions: SOURCE_EXTENSIONS },
  { path: "prisma/schema.prisma", kind: "schema", extensions: [".prisma"] },
];

const SCOPE_KINDS: Record<CorpusScope, readonly CorpusKind[]> = {
  all: ["doc", "locale", "source", "schema"],
  /** Application code + schema — how the product actually works. */
  source: ["source", "schema"],
  /** Release notes and markdown docs only. */
  docs: ["doc"],
  /** User-facing copy + docs (labels, changelog), excluding implementation. */
  product: ["doc", "locale"],
};

export function kindsForScope(scope: CorpusScope = "all"): readonly CorpusKind[] {
  return SCOPE_KINDS[scope];
}

export function fileMatchesScope(
  kind: CorpusKind,
  scope: CorpusScope = "all",
): boolean {
  return kindsForScope(scope).includes(kind);
}

const IGNORED_DIRECTORY_NAMES = new Set([
  "node_modules",
  ".git",
  ".next",
  "generated",
  "__snapshots__",
]);

const IGNORED_FILE_PATTERN = /(\.d\.ts|\.test\.tsx?|\.spec\.tsx?)$/i;

/** Skip anything too large to be useful as a support answer. */
const MAX_FILE_BYTES = 400_000;

const CACHE_TTL_MS = process.env.NODE_ENV === "production" ? Number.POSITIVE_INFINITY : 15_000;

export type IndexedFile = {
  path: string;
  kind: CorpusKind;
  /** Frontmatter or first heading title, when the file has one. */
  title?: string;
  content: string;
  lowerContent: string;
  lines: string[];
  /** Path lowercased with separators turned into spaces, for path matching. */
  searchablePath: string;
};

function repoPath(...segments: string[]): string {
  return path.join(/*turbopackIgnore: true*/ process.cwd(), ...segments);
}

export function shouldLogSearchDebug(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.SUPPORT_SEARCH_DEBUG !== "0";
}

/**
 * Production corpus snapshot. `scripts/build-support-corpus.ts` writes this
 * during `prebuild`. The support route reads it instead of walking the repo.
 *
 * Do not trace `app/`, `lib/`, or `components/` source into the function.
 * Turbopack follows imports in included `.ts` files, so those globs pulled
 * TypeScript, pdf-lib, Playwright, and every `next-server` runtime into
 * `/api/ai/support` and `/api/ai/support/translate-label` (~249MB). Vercel
 * packages that trace during `next build`. A JSON snapshot has no imports.
 */
export const SUPPORT_CORPUS_SNAPSHOT = "lib/ai/support-corpus.generated.json";

/** Glob patterns for `outputFileTracingIncludes` on the support chat route. */
export const SUPPORT_SEARCH_TRACE_INCLUDES = [`./${SUPPORT_CORPUS_SNAPSHOT}`] as const;

/**
 * Nested routes under `/api/ai/support` that must not inherit the snapshot.
 *
 * Next.js matches include keys with picomatch `{ contains: true }`, so
 * `/api/ai/support` also matches `/api/ai/support/translate-label`. Turbopack
 * on Next 16.3 does not reliably apply `outputFileTracingExcludes`; the
 * snapshot is small enough that a leak still fits under the 250MB cap. The
 * exclude stays for the webpack/self-host tracer.
 */
export const SUPPORT_SEARCH_TRACE_NESTED_EXCLUDE_ROUTE = "/api/ai/support/*";

function extractTitle(relativePath: string, content: string): string | undefined {
  const frontmatterTitle = /^---\r?\n[\s\S]*?^title:\s*["']?(.+?)["']?\s*$/m.exec(content);
  if (frontmatterTitle) return frontmatterTitle[1].trim();

  const heading = /^#\s+(.+)$/m.exec(content);
  if (heading) return heading[1].trim();

  return undefined;
}

function toSearchablePath(relativePath: string): string {
  return relativePath.toLowerCase().replace(/[\\/_.-]+/g, " ");
}

export type CorpusSourceFile = {
  path: string;
  kind: CorpusKind;
  content: string;
};

function normalizeCorpusPath(relativePath: string): string {
  return relativePath.split(path.sep).join("/");
}

export function indexCorpusSource(source: CorpusSourceFile): IndexedFile {
  const content = source.content;
  const relativePath = normalizeCorpusPath(source.path);
  return {
    path: relativePath,
    kind: source.kind,
    title: extractTitle(relativePath, content),
    content,
    lowerContent: content.toLowerCase(),
    lines: content.split("\n"),
    searchablePath: toSearchablePath(relativePath),
  };
}

export function parseCorpusSnapshot(raw: string): IndexedFile[] {
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error("Support corpus snapshot is not an array");
  }
  return parsed.map((entry) => indexCorpusSource(entry as CorpusSourceFile));
}

async function readCorpusFile(
  relativePath: string,
  kind: CorpusKind,
): Promise<CorpusSourceFile | null> {
  let content: string;
  try {
    const fileStat = await stat(repoPath(relativePath));
    if (!fileStat.isFile() || fileStat.size > MAX_FILE_BYTES) return null;
    content = await readFile(repoPath(relativePath), "utf8");
  } catch {
    return null;
  }

  return {
    path: normalizeCorpusPath(relativePath),
    kind,
    content,
  };
}

async function walkRoot(root: CorpusRoot, collected: CorpusSourceFile[]): Promise<void> {
  async function walk(relativeDir: string): Promise<void> {
    let entries: Dirent[];
    try {
      entries = await readdir(repoPath(relativeDir), { withFileTypes: true });
    } catch {
      return;
    }

    const nested: Promise<void>[] = [];
    const files: Promise<CorpusSourceFile | null>[] = [];

    for (const entry of entries) {
      const relativePath = path.join(relativeDir, entry.name);

      if (entry.isDirectory()) {
        if (IGNORED_DIRECTORY_NAMES.has(entry.name)) continue;
        nested.push(walk(relativePath));
        continue;
      }

      if (!root.extensions.some((extension) => entry.name.endsWith(extension))) continue;
      if (IGNORED_FILE_PATTERN.test(entry.name)) continue;

      files.push(readCorpusFile(relativePath, root.kind));
    }

    for (const file of await Promise.all(files)) {
      if (file) collected.push(file);
    }

    await Promise.all(nested);
  }

  if (path.extname(root.path)) {
    const file = await readCorpusFile(root.path, root.kind);
    if (file) collected.push(file);
    return;
  }

  await walk(root.path);
}

let cachedCorpus: { loadedAt: number; files: IndexedFile[] } | null = null;
let inflightLoad: Promise<IndexedFile[]> | null = null;

/** Same walk the snapshot generator uses. Development reads this directly. */
export async function collectCorpusSources(): Promise<CorpusSourceFile[]> {
  const files: CorpusSourceFile[] = [];
  await Promise.all(CORPUS_ROOTS.map((root) => walkRoot(root, files)));
  files.sort((left, right) => left.path.localeCompare(right.path));
  return files;
}

async function readProductionSnapshot(): Promise<IndexedFile[]> {
  const snapshotPath = repoPath(SUPPORT_CORPUS_SNAPSHOT);
  try {
    return parseCorpusSnapshot(await readFile(snapshotPath, "utf8"));
  } catch (error) {
    console.error(
      "[codebaseIndex] Missing support corpus snapshot. Run `bun run prebuild` before the production build.",
      { snapshotPath, error },
    );
    return [];
  }
}

async function buildCorpus(): Promise<IndexedFile[]> {
  const started = Date.now();
  // Production lambdas only contain the snapshot. Walking the repo there
  // traces every imported module (TypeScript, pdf-lib, next-server, …).
  const files =
    process.env.NODE_ENV === "production"
      ? await readProductionSnapshot()
      : (await collectCorpusSources()).map(indexCorpusSource);

  if (shouldLogSearchDebug()) {
    console.log("[codebaseIndex] Corpus built", {
      files: files.length,
      ms: Date.now() - started,
      cwd: repoPath(),
      source: process.env.NODE_ENV === "production" ? "snapshot" : "disk",
    });
  }

  if (files.length === 0) {
    console.warn("[codebaseIndex] Corpus is empty — is the working directory the repo root?", {
      cwd: repoPath(),
    });
  }

  return files;
}

export async function getCorpus(): Promise<IndexedFile[]> {
  if (cachedCorpus && Date.now() - cachedCorpus.loadedAt < CACHE_TTL_MS) {
    return cachedCorpus.files;
  }

  inflightLoad ??= buildCorpus()
    .then((files) => {
      cachedCorpus = { loadedAt: Date.now(), files };
      return files;
    })
    .finally(() => {
      inflightLoad = null;
    });

  return inflightLoad;
}

export function clearCorpusCache(): void {
  cachedCorpus = null;
}

/** Translate a `*` / `**` / `?` glob (or comma-separated list) into a matcher. */
export function createGlobMatcher(glob?: string): (relativePath: string) => boolean {
  if (!glob?.trim()) return () => true;

  const patterns = glob
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.replace(/^\.\//, ""));

  if (patterns.length === 0) return () => true;

  const regexes = patterns.map((pattern) => {
    const source = pattern
      .split(/(\*\*\/|\*\*|\*|\?)/)
      .map((segment) => {
        if (segment === "**/") return "(?:.*/)?";
        if (segment === "**") return ".*";
        if (segment === "*") return "[^/]*";
        if (segment === "?") return "[^/]";
        return segment.replace(/[.+^${}()|[\]\\]/g, "\\$&");
      })
      .join("");

    return new RegExp(`^${source}$`, "i");
  });

  return (relativePath) => {
    const normalized = relativePath.split(path.sep).join("/");
    return regexes.some((regex) => regex.test(normalized));
  };
}
