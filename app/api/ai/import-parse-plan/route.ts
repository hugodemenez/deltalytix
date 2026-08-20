import { generateObject } from "ai";
import { NextRequest } from "next/server";
import { z } from "zod/v3";
import { getOpenAiAvailabilityError } from "@/lib/ai/openai-availability";
import { importParsePlanSchema } from "./schema";

export const maxDuration = 30;

const requestSchema = z.object({
  headers: z.array(z.string()).min(1),
  rows: z.array(z.array(z.string())).max(20),
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
    const { headers, rows } = requestSchema.parse(body);

    const result = await generateObject({
      model: "openai/gpt-5-mini",
      schema: importParsePlanSchema,
      temperature: 0,
      prompt: `You write a parse plan for a trading CSV. Map each database field to an exact header name from the file, or null if it is not present.

Decide kind:
- closed-trades: a row already has entry and exit (two dates/prices, or a PnL column)
- orders: a row is a single fill/order that must be FIFO-paired later

Headers:
${headers.map((header, index) => `${index + 1}. ${header}`).join("\n")}

Sample rows:
${rows
  .slice(0, 8)
  .map((row, index) => `Row ${index + 1}: ${row.join(" | ")}`)
  .join("\n")}

Use the header text exactly as given. Do not invent headers.`,
    });

    return Response.json(result.object);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify({ error: error.errors }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    console.error("import-parse-plan failed:", error);
    return new Response(JSON.stringify({ error: "AI_UNAVAILABLE" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}
