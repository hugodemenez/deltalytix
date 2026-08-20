import { generateText } from "ai";
import { NextRequest } from "next/server";
import { z } from "zod/v3";
import { getOpenAiAvailabilityError } from "@/lib/ai/openai-availability";
import {
  PARSE_SCRIPT_CONTRACT,
  extractParseScript,
} from "@/lib/import/parse-script";

export const maxDuration = 60;

const requestSchema = z.object({
  headers: z.array(z.string()).min(1),
  rows: z.array(z.array(z.string())).max(20),
  peekText: z.string().max(8_000).optional(),
  previousScript: z.string().max(20_000).optional(),
  error: z.string().max(2_000).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const availabilityError = getOpenAiAvailabilityError();
    if (availabilityError) {
      return new Response(JSON.stringify(availabilityError), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { headers, rows, peekText, previousScript, error } =
      requestSchema.parse(body);

    const repair = previousScript
      ? `
The previous script failed: ${error ?? "unknown error"}

Previous script:
${previousScript}

Fix it. Keep parseChunk as the only entry point.
`
      : "";

    const result = await generateText({
      model: "openai/gpt-5-mini",
      temperature: 0,
      prompt: `You write a dedicated parser for one trading export. The file may be CSV, TSV, or a messy broker dump. Do not ask the user to map columns.

${PARSE_SCRIPT_CONTRACT}

Headers:
${headers.map((header, index) => `${index + 1}. ${header}`).join("\n")}

Sample rows:
${rows
  .slice(0, 8)
  .map((row, index) => `Row ${index + 1}: ${row.join(" | ")}`)
  .join("\n")}

${peekText ? `Raw peek:\n${peekText}\n` : ""}
${repair}

Reply with a single javascript code block that defines function parseChunk.`,
    });

    const script = extractParseScript(result.text);
    return Response.json({ script });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify({ error: error.errors }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    console.error("import-parse-script failed:", error);
    return new Response(JSON.stringify({ error: "AI_UNAVAILABLE" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}
