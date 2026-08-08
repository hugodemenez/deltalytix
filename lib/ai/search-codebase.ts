import path from "node:path";
import {
  type CorpusKind,
  type IndexedFile,
  createGlobMatcher,
  getCorpus,
  shouldLogSearchDebug,
} from "./codebase-index";

export { SUPPORT_SEARCH_TRACE_INCLUDES } from "./codebase-index";
export type { CorpusKind } from "./codebase-index";

const MAX_FILES = 6;
const MAX_BLOCKS_PER_FILE = 3;
const CONTEXT_RADIUS = 3;
const MAX_BLOCK_CHARS = 900;
const MAX_LINE_CHARS = 240;
const MAX_TERM_OCCURRENCES = 8;

const MAX_GREP_MATCHES = 25;
const MAX_GREP_PATTERN_LENGTH = 200;
const GREP_TIME_BUDGET_MS = 2_500;

const MAX_READ_LINES = 400;

/** Words that carry no signal in a support question. */
const SEARCH_STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "for", "to", "of", "in", "on", "at", "by",
  "how", "what", "when", "where", "why", "which", "who",
  "is", "are", "was", "were", "be", "been", "am",
  "do", "does", "did", "done", "can", "could", "should", "would", "will", "shall",
  "my", "me", "i", "we", "you", "your", "our", "it", "its", "this", "that",
  "about", "with", "from", "into", "please", "help", "need", "want",
  "documentation", "docs", "doc", "guide", "setup", "instructions", "information",
  "details", "deltalytix", "app", "platform",
  // French equivalents — the assistant answers in both languages.
  "le", "la", "les", "un", "une", "des", "de", "du", "et", "ou", "pour", "dans",
  "sur", "avec", "comment", "pourquoi", "quand", "est", "sont", "je", "tu", "il",
  "nous", "vous", "mon", "ma", "mes", "aide", "besoin", "faire",
]);

/** Weight by how likely a file is to hold a user-facing answer. */
const KIND_WEIGHT: Record<CorpusKind, number> = {
  doc: 1.7,
  locale: 1.3,
  schema: 1.1,
  source: 1,
};

export type CodebaseSearchMatch = {
  file: string;
  line: number;
  snippet: string;
  title?: string;
  kind?: CorpusKind;
  score?: number;
};

export type CodebaseSearchResult = {
  query: string;
  matchCount: number;
  matches: CodebaseSearchMatch[];
};

export type CodebaseGrepResult = {
  pattern: string;
  matchCount: number;
  matches: CodebaseSearchMatch[];
  truncated: boolean;
  error?: string;
};

export type CodebaseReadResult = {
  file: string;
  startLine: number;
  endLine: number;
  totalLines: number;
  content: string;
  truncated: boolean;
  error?: string;
};

function truncateLine(line: string): string {
  const normalized = line.replace(/\s+$/, "");
  return normalized.length > MAX_LINE_CHARS
    ? `${normalized.slice(0, MAX_LINE_CHARS)}…`
    : normalized;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Terms plus cheap singular/plural variants — "imports" should still find
 * "import", and vice versa.
 */
function termVariants(term: string): string[] {
  const variants = new Set([term]);
  if (term.endsWith("ies") && term.length > 4) variants.add(`${term.slice(0, -3)}y`);
  if (term.endsWith("es") && term.length > 3) variants.add(term.slice(0, -2));
  if (term.endsWith("s") && term.length > 3) variants.add(term.slice(0, -1));
  else variants.add(`${term}s`);
  return [...variants];
}

type SearchTerm = {
  term: string;
  variants: string[];
  /** Inverse document frequency, filled in once the corpus is scanned. */
  idf: number;
};

function buildSearchTerms(query: string): SearchTerm[] {
  const raw = query
    .toLowerCase()
    .split(/[^\p{L}\p{N}_]+/u)
    .filter((token) => token.length >= 2);

  const unique = [...new Set(raw)];
  const meaningful = unique.filter((token) => !SEARCH_STOP_WORDS.has(token));
  const chosen = meaningful.length > 0 ? meaningful : unique;

  return chosen.slice(0, 12).map((term) => ({
    term,
    variants: termVariants(term),
    idf: 1,
  }));
}

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;

  let count = 0;
  let index = haystack.indexOf(needle);
  while (index !== -1 && count < MAX_TERM_OCCURRENCES) {
    count += 1;
    index = haystack.indexOf(needle, index + needle.length);
  }
  return count;
}

function fileContainsTerm(file: IndexedFile, term: SearchTerm): boolean {
  return term.variants.some(
    (variant) =>
      file.lowerContent.includes(variant) || file.searchablePath.includes(variant),
  );
}

function localeMultiplier(file: IndexedFile, locale?: "en" | "fr"): number {
  if (!locale) return 1;

  const other = locale === "en" ? "fr" : "en";
  const normalized = file.path.split(path.sep).join("/");

  if (normalized.includes(`/${locale}/`) || normalized.endsWith(`/${locale}.ts`)) return 1.25;
  if (normalized.includes(`/${other}/`) || normalized.endsWith(`/${other}.ts`)) return 0.5;
  return 1;
}

type ScoredFile = { file: IndexedFile; score: number };

function scoreFiles(
  files: IndexedFile[],
  terms: SearchTerm[],
  phrase: string,
  locale?: "en" | "fr",
): ScoredFile[] {
  if (terms.length === 0) return [];

  // Document frequency drives idf, so a term like "rithmic" outranks "trade".
  for (const term of terms) {
    let documentFrequency = 0;
    for (const file of files) {
      if (fileContainsTerm(file, term)) documentFrequency += 1;
    }
    term.idf = Math.log((files.length + 1) / (documentFrequency + 1)) + 0.4;
  }

  const scored: ScoredFile[] = [];

  for (const file of files) {
    let score = 0;
    let matchedTerms = 0;

    for (const term of terms) {
      const contentHits = term.variants.reduce(
        (total, variant) => total + countOccurrences(file.lowerContent, variant),
        0,
      );
      const pathHit = term.variants.some((variant) => file.searchablePath.includes(variant));

      if (contentHits === 0 && !pathHit) continue;

      matchedTerms += 1;
      if (contentHits > 0) score += term.idf * (1 + Math.log(Math.min(contentHits, MAX_TERM_OCCURRENCES)));
      if (pathHit) score += term.idf * 2.5;
    }

    if (matchedTerms === 0) continue;

    // Covering every term is a much stronger signal than covering one.
    score *= 1 + (matchedTerms / terms.length) * 0.8;
    if (phrase.length > 4 && file.lowerContent.includes(phrase)) score *= 2;

    score *= KIND_WEIGHT[file.kind];
    score *= localeMultiplier(file, locale);

    scored.push({ file, score });
  }

  scored.sort((left, right) => right.score - left.score);
  return scored;
}

function lineScore(line: string, terms: SearchTerm[]): number {
  const lowerLine = line.toLowerCase();
  let score = 0;
  for (const term of terms) {
    if (term.variants.some((variant) => lowerLine.includes(variant))) score += term.idf;
  }
  return score;
}

/** Pull the strongest regions of a file, with surrounding lines for context. */
function extractBlocks(file: IndexedFile, terms: SearchTerm[]): CodebaseSearchMatch[] {
  const hits: Array<{ index: number; score: number }> = [];

  for (let index = 0; index < file.lines.length; index += 1) {
    const score = lineScore(file.lines[index], terms);
    if (score > 0) hits.push({ index, score });
  }

  if (hits.length === 0) {
    return [
      {
        file: file.path,
        line: 1,
        snippet: file.lines.slice(0, CONTEXT_RADIUS * 2 + 1).map(truncateLine).join("\n"),
        title: file.title,
        kind: file.kind,
      },
    ];
  }

  hits.sort((left, right) => right.score - left.score || left.index - right.index);

  const ranges: Array<{ start: number; end: number }> = [];
  for (const hit of hits) {
    if (ranges.length >= MAX_BLOCKS_PER_FILE) break;

    const start = Math.max(0, hit.index - CONTEXT_RADIUS);
    const end = Math.min(file.lines.length - 1, hit.index + CONTEXT_RADIUS);

    const overlapping = ranges.find((range) => start <= range.end + 1 && end >= range.start - 1);
    if (overlapping) {
      overlapping.start = Math.min(overlapping.start, start);
      overlapping.end = Math.max(overlapping.end, end);
      continue;
    }

    ranges.push({ start, end });
  }

  ranges.sort((left, right) => left.start - right.start);

  return ranges.map((range) => ({
    file: file.path,
    line: range.start + 1,
    snippet: file.lines
      .slice(range.start, range.end + 1)
      .map(truncateLine)
      .join("\n")
      .slice(0, MAX_BLOCK_CHARS),
    title: file.title,
    kind: file.kind,
  }));
}

export async function searchCodebase(
  query: string,
  options?: { locale?: "en" | "fr"; limit?: number },
): Promise<CodebaseSearchResult> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return { query: trimmedQuery, matchCount: 0, matches: [] };
  }

  const files = await getCorpus();
  const terms = buildSearchTerms(trimmedQuery);
  const scored = scoreFiles(files, terms, trimmedQuery.toLowerCase(), options?.locale);

  const fileLimit = Math.max(1, Math.min(options?.limit ?? MAX_FILES, 10));
  const matches: CodebaseSearchMatch[] = [];

  for (const { file, score } of scored.slice(0, fileLimit)) {
    for (const block of extractBlocks(file, terms)) {
      matches.push({ ...block, score: Number(score.toFixed(2)) });
    }
  }

  if (shouldLogSearchDebug()) {
    console.log("[searchCodebase]", {
      query: trimmedQuery,
      locale: options?.locale,
      terms: terms.map((term) => term.term),
      corpusFiles: files.length,
      topFiles: scored.slice(0, fileLimit).map(({ file, score }) => `${file.path} (${score.toFixed(1)})`),
    });
  }

  return { query: trimmedQuery, matchCount: matches.length, matches };
}

export async function grepCodebase(
  pattern: string,
  options?: {
    glob?: string;
    caseSensitive?: boolean;
    isRegex?: boolean;
    contextLines?: number;
    maxResults?: number;
  },
): Promise<CodebaseGrepResult> {
  const trimmedPattern = pattern.trim();
  if (!trimmedPattern) {
    return { pattern: trimmedPattern, matchCount: 0, matches: [], truncated: false };
  }

  if (trimmedPattern.length > MAX_GREP_PATTERN_LENGTH) {
    return {
      pattern: trimmedPattern,
      matchCount: 0,
      matches: [],
      truncated: false,
      error: `Pattern is too long (max ${MAX_GREP_PATTERN_LENGTH} characters).`,
    };
  }

  let regex: RegExp;
  try {
    const source = options?.isRegex === false ? escapeRegExp(trimmedPattern) : trimmedPattern;
    regex = new RegExp(source, options?.caseSensitive ? "" : "i");
  } catch (error) {
    return {
      pattern: trimmedPattern,
      matchCount: 0,
      matches: [],
      truncated: false,
      error: `Invalid regular expression: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  const files = await getCorpus();
  const matchesGlob = createGlobMatcher(options?.glob);
  const contextRadius = Math.max(0, Math.min(options?.contextLines ?? 2, 6));
  const maxResults = Math.max(1, Math.min(options?.maxResults ?? MAX_GREP_MATCHES, MAX_GREP_MATCHES));

  const matches: CodebaseSearchMatch[] = [];
  const deadline = Date.now() + GREP_TIME_BUDGET_MS;
  let truncated = false;

  for (const file of files) {
    if (matches.length >= maxResults) {
      truncated = true;
      break;
    }
    if (Date.now() > deadline) {
      truncated = true;
      break;
    }
    if (!matchesGlob(file.path)) continue;
    if (!regex.test(file.content)) continue;

    for (let index = 0; index < file.lines.length; index += 1) {
      if (matches.length >= maxResults) {
        truncated = true;
        break;
      }
      if (!regex.test(file.lines[index])) continue;

      const start = Math.max(0, index - contextRadius);
      const end = Math.min(file.lines.length - 1, index + contextRadius);

      matches.push({
        file: file.path,
        line: index + 1,
        snippet: file.lines
          .slice(start, end + 1)
          .map(truncateLine)
          .join("\n")
          .slice(0, MAX_BLOCK_CHARS),
        title: file.title,
        kind: file.kind,
      });
    }
  }

  if (shouldLogSearchDebug()) {
    console.log("[grepCodebase]", {
      pattern: trimmedPattern,
      glob: options?.glob,
      matchCount: matches.length,
      truncated,
    });
  }

  return { pattern: trimmedPattern, matchCount: matches.length, matches, truncated };
}

export async function readCodebaseFile(
  filePath: string,
  options?: { startLine?: number; endLine?: number },
): Promise<CodebaseReadResult> {
  const normalized = filePath.trim().replace(/^\.\//, "").split(path.sep).join("/");
  const files = await getCorpus();
  const file = files.find(
    (candidate) => candidate.path.split(path.sep).join("/") === normalized,
  );

  if (!file) {
    return {
      file: normalized,
      startLine: 0,
      endLine: 0,
      totalLines: 0,
      content: "",
      truncated: false,
      error:
        "File is not part of the searchable corpus. Use searchCodebase or grepCodebase to find a valid path first.",
    };
  }

  const totalLines = file.lines.length;
  const requestedStart = Math.max(1, options?.startLine ?? 1);
  const requestedEnd = Math.min(totalLines, options?.endLine ?? totalLines);
  const startLine = Math.min(requestedStart, totalLines);
  const cappedEnd = Math.min(
    Math.max(requestedEnd, startLine),
    startLine + MAX_READ_LINES - 1,
  );

  const content = file.lines
    .slice(startLine - 1, cappedEnd)
    .map((line, offset) => `${startLine + offset}: ${truncateLine(line)}`)
    .join("\n");

  return {
    file: file.path,
    startLine,
    endLine: cappedEnd,
    totalLines,
    content,
    truncated: cappedEnd < requestedEnd || cappedEnd < totalLines,
  };
}

export async function listCodebaseFiles(
  glob?: string,
  limit = 40,
): Promise<{ glob: string; fileCount: number; files: string[]; truncated: boolean }> {
  const files = await getCorpus();
  const matchesGlob = createGlobMatcher(glob);
  const matched = files.filter((file) => matchesGlob(file.path)).map((file) => file.path);

  return {
    glob: glob?.trim() ?? "**/*",
    fileCount: matched.length,
    files: matched.slice(0, limit),
    truncated: matched.length > limit,
  };
}
