import { tool } from "ai";
import { z } from "zod";
import {
  grepCodebase,
  listCodebaseFiles,
  readCodebaseFile,
  searchCodebase,
} from "@/lib/ai/search-codebase";

export const searchCodebaseTool = tool({
  description:
    "Ranked keyword search across Deltalytix product docs (content/**), release notes, locale strings (every UI label lives there), and application source (app, components, lib, server, store, hooks, prisma schema). Start here for any question about features, imports, integrations, billing, dashboard behaviour, or self-hosting. Returns the strongest files with surrounding context lines.",
  inputSchema: z.object({
    query: z
      .string()
      .describe(
        "Keywords describing what to look up, e.g. 'Tradovate CSV import timezone' or 'subscription cancel billing portal'",
      ),
    locale: z
      .enum(["en", "fr"])
      .optional()
      .describe("Prefer documentation and locale strings in this language"),
  }),
  execute: async ({ query, locale }) => {
    const result = await searchCodebase(query, { locale });

    if (result.matchCount === 0) {
      return {
        found: false,
        query: result.query,
        message:
          "No matches. Try fewer or different keywords, or use grepCodebase with a specific identifier, UI label, or error string.",
        matches: [],
      };
    }

    return {
      found: true,
      query: result.query,
      matchCount: result.matchCount,
      matches: result.matches,
    };
  },
});

export const grepCodebaseTool = tool({
  description:
    "Regex grep over the Deltalytix repository (docs, locales, and source). Use this when you know an exact string to look for — a UI label, an error message, an env var, a function or route name — or to narrow a search to specific files with a glob. Prefer searchCodebase for open-ended questions.",
  inputSchema: z.object({
    pattern: z
      .string()
      .describe(
        "JavaScript regular expression, e.g. 'RESEND_API_KEY' or 'stripe.*checkout'. Case-insensitive by default.",
      ),
    glob: z
      .string()
      .optional()
      .describe(
        "Optional path filter, comma-separated. Examples: 'content/updates/en/**/*.mdx', 'locales/**/*.ts', 'app/api/**/*.ts'",
      ),
    caseSensitive: z.boolean().optional().describe("Match case exactly (default false)"),
    contextLines: z
      .number()
      .int()
      .min(0)
      .max(6)
      .optional()
      .describe("Lines of context around each match (default 2)"),
  }),
  execute: async ({ pattern, glob, caseSensitive, contextLines }) => {
    const result = await grepCodebase(pattern, { glob, caseSensitive, contextLines });

    if (result.error) {
      return { found: false, pattern: result.pattern, error: result.error, matches: [] };
    }

    if (result.matchCount === 0) {
      return {
        found: false,
        pattern: result.pattern,
        message:
          "No matches. Loosen the pattern, drop the glob, or fall back to searchCodebase.",
        matches: [],
      };
    }

    return {
      found: true,
      pattern: result.pattern,
      matchCount: result.matchCount,
      truncated: result.truncated,
      matches: result.matches,
    };
  },
});

export const readCodebaseFileTool = tool({
  description:
    "Read a file (or a line range) that searchCodebase or grepCodebase returned. Use it when a snippet is not enough to answer confidently — for example to read a whole release note or a full locale section.",
  inputSchema: z.object({
    file: z
      .string()
      .describe("Repository-relative path exactly as returned by a previous search"),
    startLine: z.number().int().min(1).optional().describe("First line to read (1-indexed)"),
    endLine: z.number().int().min(1).optional().describe("Last line to read (inclusive)"),
  }),
  execute: async ({ file, startLine, endLine }) => readCodebaseFile(file, { startLine, endLine }),
});

export const listCodebaseFilesTool = tool({
  description:
    "List searchable files matching a glob. Useful to discover what documentation exists, e.g. 'content/updates/en/**/*.mdx' to see every release note.",
  inputSchema: z.object({
    glob: z
      .string()
      .optional()
      .describe("Glob pattern, e.g. 'content/**/*.mdx' or 'locales/en/*.ts'"),
  }),
  execute: async ({ glob }) => listCodebaseFiles(glob),
});
