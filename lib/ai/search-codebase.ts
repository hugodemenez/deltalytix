import type { Dirent } from "node:fs";
import { access, readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

/** Product documentation and user-facing copy only — not full locale aggregates. */
const CONTENT_ROOT = "content" as const;

export const SUPPORT_SEARCH_TRACE_INCLUDES = [
  "./content/**/*",
  "./locales/en/support.ts",
  "./locales/fr/support.ts",
  "./locales/en/faq.ts",
  "./locales/fr/faq.ts",
  "./locales/en/chat.ts",
  "./locales/fr/chat.ts",
  "./locales/en/landing.ts",
  "./locales/fr/landing.ts",
  "./README.md",
  "./SELF_HOSTING.md",
  "./AGENTS.md",
] as const;

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

function shouldLogSearchDebug(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.SUPPORT_SEARCH_DEBUG !== "0";
}

const SEARCH_STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "for",
  "to",
  "how",
  "what",
  "when",
  "where",
  "why",
  "is",
  "are",
  "was",
  "were",
  "do",
  "does",
  "did",
  "can",
  "could",
  "should",
  "would",
  "about",
  "with",
  "from",
  "into",
  "documentation",
  "docs",
  "guide",
  "help",
  "setup",
  "instructions",
  "information",
  "details",
]);

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

function repoPath(...segments: string[]): string {
  return path.join(/*turbopackIgnore: true*/ process.cwd(), ...segments);
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

function parseSearchTerms(query: string): string[] {
  const rawTerms = query
    .trim()
    .split(/\s+/)
    .map((term) => term.replace(/[^\p{L}\p{N}_-]/gu, ""))
    .filter((term) => term.length >= 2);

  const terms = [
    ...new Set(rawTerms.filter((term) => !SEARCH_STOP_WORDS.has(term.toLowerCase()))),
  ];

  return terms.length > 0 ? terms : rawTerms.slice(0, 1);
}

function fileContainsAllTerms(content: string, terms: string[]): boolean {
  const lowerContent = content.toLowerCase();
  return terms.every((term) => lowerContent.includes(term.toLowerCase()));
}

function fileNameContainsAllTerms(relativePath: string, terms: string[]): boolean {
  const slug = path
    .basename(relativePath, path.extname(relativePath))
    .toLowerCase()
    .replace(/-/g, " ");
  return terms.every((term) => slug.includes(term.toLowerCase()));
}

function fileMatchesTerms(relativePath: string, content: string, terms: string[]): boolean {
  return (
    fileContainsAllTerms(content, terms) || fileNameContainsAllTerms(relativePath, terms)
  );
}

const GENERIC_SEARCH_TERMS = new Set([
  "firm",
  "sync",
  "account",
  "import",
  "trade",
  "trades",
  "selection",
  "support",
  "connection",
  "dashboard",
]);

function pickPrimarySearchTerm(terms: string[]): string {
  const distinctiveTerms = terms.filter(
    (term) => !GENERIC_SEARCH_TERMS.has(term.toLowerCase()),
  );
  return distinctiveTerms[0] ?? terms[0];
}

function lineMatchedTermCount(line: string, terms: string[]): number {
  const lowerLine = line.toLowerCase();
  return terms.filter((term) => lowerLine.includes(term.toLowerCase())).length;
}

async function searchFile(
  relativePath: string,
  terms: string[],
  matches: CodebaseSearchMatch[],
): Promise<void> {
  if (matches.length >= MAX_RESULTS || terms.length === 0) return;

  const absolutePath = repoPath(relativePath);

  let content: string;
  try {
    content = await readFile(absolutePath, "utf8");
  } catch {
    return;
  }

  if (!fileMatchesTerms(relativePath, content, terms)) {
    return;
  }

  const lines = content.split("\n");
  const lineMatches: Array<{ index: number; score: number }> = [];

  for (let index = 0; index < lines.length; index += 1) {
    const score = lineMatchedTermCount(lines[index], terms);
    if (score === 0) continue;
    lineMatches.push({ index, score });
  }

  lineMatches.sort((left, right) => right.score - left.score);

  for (const { index } of lineMatches) {
    matches.push({
      file: relativePath,
      line: index + 1,
      snippet: normalizeSnippet(lines[index]),
    });

    if (matches.length >= MAX_RESULTS) break;
  }
}

async function searchFiles(
  terms: string[],
  searchPaths: string[],
): Promise<CodebaseSearchMatch[]> {
  const matches: CodebaseSearchMatch[] = [];

  async function walk(dir: string): Promise<void> {
    if (matches.length >= MAX_RESULTS) return;

    const absoluteDir = repoPath(dir);
    if (!(await fileExists(absoluteDir))) return;

    let entries: Dirent[];
    try {
      entries = await readdir(absoluteDir, { withFileTypes: true });
    } catch (error) {
      if (shouldLogSearchDebug()) {
        console.warn("[searchCodebase] Skipping unreadable directory", {
          dir,
          error: error instanceof Error ? error.message : String(error),
        });
      }
      return;
    }

    for (const entry of entries) {
      if (matches.length >= MAX_RESULTS) break;

      const relativePath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === ".git") continue;
        await walk(relativePath);
        continue;
      }

      if (!isSearchableFile(relativePath)) continue;

      await searchFile(relativePath, terms, matches);
    }
  }

  for (const searchPath of searchPaths) {
    if (matches.length >= MAX_RESULTS) break;

    const absolutePath = repoPath(searchPath);

    try {
      const fileStat = await stat(absolutePath);
      if (fileStat.isFile()) {
        if (isSearchableFile(searchPath)) {
          await searchFile(searchPath, terms, matches);
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
    if (await fileExists(repoPath(searchPath))) {
      existingPaths.push(searchPath);
    }
  }

  if (existingPaths.length === 0) {
    console.warn("[searchCodebase] No searchable paths found", {
      cwd: repoPath(),
      requestedPaths: searchPaths,
    });
    return [];
  }

  const terms = parseSearchTerms(query);
  let matches = await searchFiles(terms, existingPaths);

  if (matches.length === 0 && terms.length > 1) {
    matches = await searchFiles([pickPrimarySearchTerm(terms)], existingPaths);
  }

  return matches;
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
