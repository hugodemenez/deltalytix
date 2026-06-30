import { tool } from "ai";
import { z } from "zod";
import { searchCodebase } from "@/lib/ai/search-codebase";

export const searchCodebaseTool = tool({
  description:
    "Search Deltalytix product documentation, release notes, locale strings, and self-hosting guides in the repository. Use this before answering questions about features, imports, billing, dashboard behavior, or setup.",
  inputSchema: z.object({
    query: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .describe(
        "Keywords or a short phrase describing what to look up, e.g. 'import CSV trades' or 'Tradovate sync'",
      ),
    locale: z
      .enum(["en", "fr"])
      .optional()
      .describe("Prefer documentation in this language when available"),
  }),
  execute: async ({ query, locale }) => {
    const result = await searchCodebase(query, { locale });

    if (result.matchCount === 0) {
      return {
        found: false,
        query: result.query,
        message:
          "No matching documentation was found. Ask a clarifying question or escalate to email support.",
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
