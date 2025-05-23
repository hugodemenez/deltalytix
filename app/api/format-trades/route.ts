import { openai } from "@ai-sdk/openai";
import { streamObject } from "ai";
import { NextRequest } from "next/server";
import { tradeSchema } from "./schema";
import { z } from "zod";

export const maxDuration = 30;

const requestSchema = z.object({
  headers: z.array(z.string()),
  rows: z.array(z.array(z.string())).max(100, "Too many rows to process")
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { headers, rows } = requestSchema.parse(body);

    const result = streamObject({
      model: openai("gpt-4o-mini-2024-07-18"),
      schema: tradeSchema,
      output: 'array',
      system:`
      You are a trading expert.
      You are given a list of trade data and you need to format it according to the schema.
      Rules for formatting:
      Do not make up any information.
      1. Instrument names:
        - Most common instruments: ES, NQ, NG, ZN, ZB, etc.
        - Remove expiration dates (H5, Z4, etc.), ESH does not exist
        - Remove exchange (e.g. MESH5@CME becomes MES, MESH5@CME becomes ES, ZN@CME becomes ZN, etc.)
      2. Convert all numeric values to numbers (remove currency symbols, commas)
      3. Convert dates to ISO strings
      4. If accountNumber is provided, use it as the accountNumber
      5. Determine trade side based on:
         - If side is provided: use it directly (normalize 'buy'/'long'/'b' to 'long', 'sell'/'short'/'s' to 'short')
         - If not provided: determine from entry/close dates and prices when available
      6. Convert time in position to seconds
      7. Handle missing values appropriately:
        - Omit missing fields until they can be filled
      8. Ensure all required fields are populated:
        - entryPrice (string)
        - closePrice (string)
        - commission (number) can be 0 if not available
        - quantity (number)
        - pnl (number)
        - side (string)
        - entryDate (ISO string)
        - closeDate (ISO string)
        - instrument (string)
        - accountNumber (string)
      `,
      prompt:  `
      Format the following ${rows.length} trades data.
      Headers: ${headers.join(", ")}
      Rows:
      ${rows.map((row: string[]) => row.join(", ")).join("\n")}
    `,
    temperature: 0.1,
  });

  return result.toTextStreamResponse();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify({ error: error.errors }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: "Invalid request format" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
}