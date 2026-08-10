import { tool } from "ai";
import { z } from "zod";
import {
  grepCodebase,
  listCodebaseFiles,
  readCodebaseFile,
  searchCodebase,
} from "@/lib/ai/search-codebase";

const corpusScopeSchema = z
  .enum(["all", "source", "docs", "product"])
  .optional()
  .describe(
    "Corpus slice. Use source for how the product works (app/lib/components/server/store/hooks/context + prisma). Use docs for release notes/markdown. Use product for docs + locale UI labels. Default all.",
  );

export const searchCodebaseTool = tool({
  description:
    "Ranked keyword search over the Deltalytix repo clone (docs, locales, and application source). For how a feature works, set scope=source so results come from code instead of changelog prose. Returns the strongest files with surrounding context lines.",
  inputSchema: z.object({
    query: z
      .string()
      .describe(
        "Keywords describing what to look up, e.g. 'Tradovate OAuth connect' or 'subscription cancel billing portal'",
      ),
    locale: z
      .enum(["en", "fr"])
      .optional()
      .describe("Prefer documentation and locale strings in this language"),
    scope: corpusScopeSchema,
  }),
  execute: async ({ query, locale, scope }) => {
    const result = await searchCodebase(query, { locale, scope });

    if (result.matchCount === 0) {
      return {
        found: false,
        query: result.query,
        scope: result.scope,
        message:
          "No matches. Try fewer keywords, switch scope (source vs docs), or use grepCodebase with a concrete identifier.",
        matches: [],
      };
    }

    return {
      found: true,
      query: result.query,
      scope: result.scope,
      matchCount: result.matchCount,
      matches: result.matches,
    };
  },
});

export const grepCodebaseTool = tool({
  description:
    "Regex grep over the Deltalytix repo clone. Prefer this to understand real behaviour: search function names, route paths, env vars, error strings, and UI labels in source (scope=source, glob like 'app/**/*.ts' or 'lib/**/*.ts'). Then readCodebaseFile the hits.",
  inputSchema: z.object({
    pattern: z
      .string()
      .describe(
        "JavaScript regular expression, e.g. 'cancelSubscription' or 'stripe.*portal'. Case-insensitive by default.",
      ),
    glob: z
      .string()
      .optional()
      .describe(
        "Optional path filter, comma-separated. Examples: 'lib/**/*.ts', 'app/api/**/*.ts', 'app/**/billing/**/*.tsx'",
      ),
    scope: corpusScopeSchema,
    caseSensitive: z.boolean().optional().describe("Match case exactly (default false)"),
    contextLines: z
      .number()
      .int()
      .min(0)
      .max(6)
      .optional()
      .describe("Lines of context around each match (default 2)"),
  }),
  execute: async ({ pattern, glob, scope, caseSensitive, contextLines }) => {
    const result = await grepCodebase(pattern, {
      glob,
      scope,
      caseSensitive,
      contextLines,
    });

    if (result.error) {
      return {
        found: false,
        pattern: result.pattern,
        scope: result.scope,
        error: result.error,
        matches: [],
      };
    }

    if (result.matchCount === 0) {
      return {
        found: false,
        pattern: result.pattern,
        scope: result.scope,
        message:
          "No matches. Loosen the pattern, drop the glob, try scope=all, or fall back to searchCodebase.",
        matches: [],
      };
    }

    return {
      found: true,
      pattern: result.pattern,
      scope: result.scope,
      matchCount: result.matchCount,
      truncated: result.truncated,
      matches: result.matches,
    };
  },
});

export const readCodebaseFileTool = tool({
  description:
    "Read a file (or line range) from the repo clone. Use after grep/search when a snippet is not enough to explain behaviour confidently.",
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
    "List files in the repo clone matching a glob. Useful to map a feature area before grepping, e.g. 'app/**/tradovate/**/*.ts' or 'lib/ibkr*.ts'.",
  inputSchema: z.object({
    glob: z
      .string()
      .optional()
      .describe("Glob pattern, e.g. 'app/**/billing/**' or 'lib/**/*stripe*'"),
    scope: corpusScopeSchema,
  }),
  execute: async ({ glob, scope }) => listCodebaseFiles(glob, { scope }),
});
