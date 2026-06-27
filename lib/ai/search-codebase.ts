import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

const execFileAsync = promisify(execFile);

const REPO_ROOT = process.cwd();

const SEARCH_ROOTS = ["content", "locales"] as const;

const ROOT_MARKDOWN_FILES = ["README.md", "SELF_HOSTING.md", "AGENTS.md"] as const;

const MAX_RESULTS = 12;
const MAX_SNIPPET_CHARS = 600;

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
    return path.join("content", "updates", locale);
  }

  return undefined;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function searchWithRipgrep(
  query: string,
  searchPaths: string[],
): Promise<CodebaseSearchMatch[] | null> {
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

      if (!/\.(md|mdx|ts)$/i.test(entry.name)) continue;

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
  }

  for (const searchPath of searchPaths) {
    const absolutePath = path.join(REPO_ROOT, searchPath);
    const stats = await import("node:fs/promises").then((fs) => fs.stat(absolutePath));

    if (stats.isFile()) {
      const content = await readFile(absolutePath, "utf8");
      const lines = content.split("\n");

      for (let index = 0; index < lines.length; index += 1) {
        if (!pattern.test(lines[index])) continue;

        matches.push({
          file: searchPath,
          line: index + 1,
          snippet: normalizeSnippet(lines[index]),
        });

        if (matches.length >= MAX_RESULTS) break;
      }
      continue;
    }

    await walk(searchPath);
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
  const fallbackPaths = [...SEARCH_ROOTS, ...ROOT_MARKDOWN_FILES].filter(
    (value, index, array) => array.indexOf(value) === index,
  );

  const existingLocalePaths: string[] = [];
  if (localePath && (await fileExists(path.join(REPO_ROOT, localePath)))) {
    existingLocalePaths.push(localePath);
  }

  const existingFallbackPaths: string[] = [];
  for (const searchPath of fallbackPaths) {
    if (await fileExists(path.join(REPO_ROOT, searchPath))) {
      existingFallbackPaths.push(searchPath);
    }
  }

  let matches: CodebaseSearchMatch[] = [];

  if (existingLocalePaths.length > 0) {
    const localeMatches = await searchWithRipgrep(trimmedQuery, existingLocalePaths);
    matches =
      localeMatches ?? (await searchWithNodeFs(trimmedQuery, existingLocalePaths));
  }

  if (matches.length === 0 && existingFallbackPaths.length > 0) {
    const fallbackMatches = await searchWithRipgrep(trimmedQuery, existingFallbackPaths);
    matches =
      fallbackMatches ??
      (await searchWithNodeFs(trimmedQuery, existingFallbackPaths));
  }

  return {
    query: trimmedQuery,
    matchCount: matches.length,
    matches,
  };
}
