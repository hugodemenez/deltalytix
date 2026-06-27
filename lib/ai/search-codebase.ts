import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { access, readFile, stat } from "node:fs/promises";
import path from "node:path";

const execFileAsync = promisify(execFile);

const REPO_ROOT = process.cwd();

/** Product documentation and user-facing copy only — not full locale aggregates. */
const CONTENT_ROOT = "content" as const;

const LOCALE_DOC_FILES = [
  "locales/en/support.ts",
  "locales/fr/support.ts",
  "locales/en/faq.ts",
  "locales/fr/faq.ts",
  "locales/en/chat.ts",
  "locales/fr/chat.ts",
  "locales/en/landing.ts",
  "locales/fr/landing.ts",
] as const;

const ROOT_MARKDOWN_FILES = ["README.md", "SELF_HOSTING.md", "AGENTS.md"] as const;

const MAX_RESULTS = 12;
const MAX_SNIPPET_CHARS = 600;

const SEARCHABLE_FILE_PATTERN = /\.(md|mdx|ts)$/i;

/** Ripgrep is unavailable on Vercel serverless; use Node fs there and in production. */
const PREFER_NODE_FS_SEARCH =
  process.env.VERCEL === "1" || process.env.NODE_ENV === "production";

export type CodebaseSearchMatch = {
  file: string;
  line: number;
  snippet: string;
};

export type CodebaseSearchResult = {
  query: string;
  matchCount: number;
  matches: CodebaseSearchMatch[];
};

function normalizeSnippet(text: string): string {
  return text.replace(/\s+/g, " ").trim().slice(0, MAX_SNIPPET_CHARS);
}

function localeContentPath(locale?: string): string | undefined {
  if (locale === "en" || locale === "fr") {
    return path.join(CONTENT_ROOT, "updates", locale);
  }

  return undefined;
}

function isSearchableFile(relativePath: string): boolean {
  return SEARCHABLE_FILE_PATTERN.test(relativePath);
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function buildFallbackSearchPaths(): string[] {
  return [CONTENT_ROOT, ...LOCALE_DOC_FILES, ...ROOT_MARKDOWN_FILES];
}

async function searchWithRipgrep(
  query: string,
  searchPaths: string[],
): Promise<CodebaseSearchMatch[] | null> {
  if (PREFER_NODE_FS_SEARCH) {
    return null;
  }

  try {
    const { stdout } = await execFileAsync(
      "rg",
      [
        "-i",
        "--json",
        "-m",
        String(MAX_RESULTS),
        "--context",
        "1",
        "--glob",
        "*.md",
        "--glob",
        "*.mdx",
        "--glob",
        "*.ts",
        query,
        ...searchPaths,
      ],
      {
        cwd: REPO_ROOT,
        maxBuffer: 10 * 1024 * 1024,
      },
    );

    const matches: CodebaseSearchMatch[] = [];
    const seen = new Set<string>();

    for (const line of stdout.split("\n")) {
      if (!line.trim()) continue;

      let event: { type?: string; data?: Record<string, unknown> };
      try {
        event = JSON.parse(line);
      } catch {
        continue;
      }

      if (event.type !== "match" || !event.data) continue;

      const pathData = event.data.path as string | { text?: string } | undefined;
      const filePath =
        typeof pathData === "string" ? pathData : String(pathData?.text ?? "");
      const lineNumber = Number(event.data.line_number ?? 0);
      const lines = (event.data.lines as { text?: string } | undefined)?.text;

      if (!filePath || !lineNumber || !lines) continue;
      if (!isSearchableFile(filePath)) continue;

      const key = `${filePath}:${lineNumber}`;
      if (seen.has(key)) continue;
      seen.add(key);

      matches.push({
        file: filePath,
        line: lineNumber,
        snippet: normalizeSnippet(lines),
      });

      if (matches.length >= MAX_RESULTS) break;
    }

    return matches;
  } catch {
    return null;
  }
}

async function searchFile(
  relativePath: string,
  pattern: RegExp,
  matches: CodebaseSearchMatch[],
): Promise<void> {
  if (matches.length >= MAX_RESULTS) return;

  const absolutePath = path.join(REPO_ROOT, relativePath);
  const content = await readFile(absolutePath, "utf8");
  const lines = content.split("\n");

  for (let index = 0; index < lines.length; index += 1) {
    if (!pattern.test(lines[index])) continue;

    matches.push({
      file: relativePath,
      line: index + 1,
      snippet: normalizeSnippet(lines[index]),
    });

    if (matches.length >= MAX_RESULTS) break;
  }
}

async function searchWithNodeFs(
  query: string,
  searchPaths: string[],
): Promise<CodebaseSearchMatch[]> {
  const pattern = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  const matches: CodebaseSearchMatch[] = [];

  async function walk(dir: string): Promise<void> {
    if (matches.length >= MAX_RESULTS) return;

    const absoluteDir = path.join(REPO_ROOT, dir);
    if (!(await fileExists(absoluteDir))) return;

    const { readdir } = await import("node:fs/promises");
    const entries = await readdir(absoluteDir, { withFileTypes: true });

    for (const entry of entries) {
      if (matches.length >= MAX_RESULTS) break;

      const relativePath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === ".git") continue;
        await walk(relativePath);
        continue;
      }

      if (!isSearchableFile(relativePath)) continue;

      await searchFile(relativePath, pattern, matches);
    }
  }

  for (const searchPath of searchPaths) {
    if (matches.length >= MAX_RESULTS) break;

    const absolutePath = path.join(REPO_ROOT, searchPath);

    try {
      const fileStat = await stat(absolutePath);
      if (fileStat.isFile()) {
        if (isSearchableFile(searchPath)) {
          await searchFile(searchPath, pattern, matches);
        }
        continue;
      }
    } catch {
      continue;
    }

    await walk(searchPath);
  }

  return matches;
}

async function runSearch(
  query: string,
  searchPaths: string[],
): Promise<CodebaseSearchMatch[]> {
  const existingPaths: string[] = [];
  for (const searchPath of searchPaths) {
    if (await fileExists(path.join(REPO_ROOT, searchPath))) {
      existingPaths.push(searchPath);
    }
  }

  if (existingPaths.length === 0) {
    return [];
  }

  const ripgrepMatches = await searchWithRipgrep(query, existingPaths);
  return ripgrepMatches ?? (await searchWithNodeFs(query, existingPaths));
}

export async function searchCodebase(
  query: string,
  options?: { locale?: "en" | "fr" },
): Promise<CodebaseSearchResult> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return { query: trimmedQuery, matchCount: 0, matches: [] };
  }

  const localePath = localeContentPath(options?.locale);
  const fallbackPaths = buildFallbackSearchPaths();

  let matches: CodebaseSearchMatch[] = [];

  if (localePath) {
    matches = await runSearch(trimmedQuery, [localePath]);
  }

  if (matches.length === 0) {
    matches = await runSearch(trimmedQuery, fallbackPaths);
  }

  return {
    query: trimmedQuery,
    matchCount: matches.length,
    matches,
  };
}
