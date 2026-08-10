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
 * Glob patterns for `outputFileTracingIncludes` — the corpus is read from disk
 * at runtime, so it has to survive into the serverless bundle.
 */
export const SUPPORT_SEARCH_TRACE_INCLUDES: readonly string[] = CORPUS_ROOTS.flatMap(
  (root) =>
    path.extname(root.path)
      ? [`./${root.path}`]
      : root.extensions.map((extension) => `./${root.path}/**/*${extension}`),
);

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

async function loadFile(
  relativePath: string,
  kind: CorpusKind,
): Promise<IndexedFile | null> {
  let content: string;
  try {
    const fileStat = await stat(repoPath(relativePath));
    if (!fileStat.isFile() || fileStat.size > MAX_FILE_BYTES) return null;
    content = await readFile(repoPath(relativePath), "utf8");
  } catch {
    return null;
  }

  return {
    path: relativePath,
    kind,
    title: extractTitle(relativePath, content),
    content,
    lowerContent: content.toLowerCase(),
    lines: content.split("\n"),
    searchablePath: toSearchablePath(relativePath),
  };
}

async function walkRoot(root: CorpusRoot, collected: IndexedFile[]): Promise<void> {
  async function walk(relativeDir: string): Promise<void> {
    let entries: Dirent[];
    try {
      entries = await readdir(repoPath(relativeDir), { withFileTypes: true });
    } catch {
      return;
    }

    const nested: Promise<void>[] = [];
    const files: Promise<IndexedFile | null>[] = [];

    for (const entry of entries) {
      const relativePath = path.join(relativeDir, entry.name);

      if (entry.isDirectory()) {
        if (IGNORED_DIRECTORY_NAMES.has(entry.name)) continue;
        nested.push(walk(relativePath));
        continue;
      }

      if (!root.extensions.some((extension) => entry.name.endsWith(extension))) continue;
      if (IGNORED_FILE_PATTERN.test(entry.name)) continue;

      files.push(loadFile(relativePath, root.kind));
    }

    for (const file of await Promise.all(files)) {
      if (file) collected.push(file);
    }

    await Promise.all(nested);
  }

  if (path.extname(root.path)) {
    const file = await loadFile(root.path, root.kind);
    if (file) collected.push(file);
    return;
  }

  await walk(root.path);
}

let cachedCorpus: { loadedAt: number; files: IndexedFile[] } | null = null;
let inflightLoad: Promise<IndexedFile[]> | null = null;

async function buildCorpus(): Promise<IndexedFile[]> {
  const started = Date.now();
  const files: IndexedFile[] = [];

  await Promise.all(CORPUS_ROOTS.map((root) => walkRoot(root, files)));
  files.sort((left, right) => left.path.localeCompare(right.path));

  if (shouldLogSearchDebug()) {
    console.log("[codebaseIndex] Corpus built", {
      files: files.length,
      ms: Date.now() - started,
      cwd: repoPath(),
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
