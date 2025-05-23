import { openai } from "@ai-sdk/openai";
import { streamObject } from "ai";
import { NextRequest } from "next/server";
import { mappingSchema } from "./schema";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fieldColumns, firstRows } = typeof body === 'string' ? JSON.parse(body) : body;

    if (!fieldColumns || !firstRows) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const result = streamObject({
      model: openai("gpt-4o-mini-2024-07-18"),
      schema: mappingSchema,
      prompt:
        `The following columns are the headings from a CSV import file for a trading system. ` +
        `Map these column names to the correct fields in our database (accountNumber, instrument, entryId, closeId, quantity, entryPrice, closePrice, entryDate, closeDate, pnl, timeInPosition, side, commission) by providing the matching column name for each field. ` +
        `You may also consult the first few rows of data to help you make the mapping, but you are mapping the columns, not the values. ` +
        `If you are not sure or there is no matching column, omit the value.\n\n` +
        `Columns:\n${fieldColumns.join(",")}\n\n` +
        `First few rows of data:\n` +
        firstRows.map((row: Record<string, string>) => JSON.stringify(row)).join("\n"),
      temperature: 0.2,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Error in mappings route:", error);
    return new Response(JSON.stringify({ error: "Failed to generate mappings" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}