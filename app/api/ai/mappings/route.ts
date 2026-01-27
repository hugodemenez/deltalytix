import { openai } from "@ai-sdk/openai";
import { Output, streamObject, streamText } from "ai";
import { NextRequest } from "next/server";
import { mappingSchema } from "./schema";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fieldColumns, firstRows } =
      typeof body === "string" ? JSON.parse(body) : body;

    if (!fieldColumns || !firstRows) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const result = streamText({
      model: "openai/gpt-5-mini",
      output: Output.object({schema:mappingSchema}),
      onFinish: (result) => {
        console.log("=== AI RESPONSE ===");
        console.log(
          "AI Mapping Result:",
          JSON.stringify(result.text, null, 2),
        );
      },
      onError: (error) => {
        console.error("=== AI ERROR ===");
        console.error("AI Mapping Error:", error);
      },
      prompt:
        `You are a trading data expert. Analyze the CSV columns and their data patterns to map them to the correct database fields. ` +
        `Look at BOTH the column names AND the actual data values to make intelligent mappings.\n\n` +
        `Available database fields:\n` +
        `- accountNumber: Account identifier (numbers, letters, or alphanumeric)\n` +
        `- instrument: Trading symbol/ticker (e.g., EURNZD, BTCUSD, ES, etc.)\n` +
        `- entryId: Unique buy transaction ID (usually numeric or alphanumeric)\n` +
        `- closeId: Unique sell transaction ID (usually numeric or alphanumeric)\n` +
        `- quantity: Number of units traded (decimal numbers)\n` +
        `- entryPrice: Buy/entry price (decimal numbers)\n` +
        `- closePrice: Sell/exit price (decimal numbers)\n` +
        `- entryDate: Entry/buy date (date/time strings like "2025-09-12 09:41:09")\n` +
        `- closeDate: Exit/sell date (date/time strings like "2025-09-18 02:12:02")\n` +
        `- pnl: Profit/loss amount (decimal numbers, can be negative)\n` +
        `- timeInPosition: Duration in seconds (numeric values)\n` +
        `- side: Trade direction ("buy", "sell", "long", "short")\n` +
        `- commission: Trading fees (decimal numbers)\n\n` +
        `CRITICAL: Analyze column CONTEXT and ORDER, not just names:\n` +
        `- Column order matters: entryDate → entryPrice → closeDate → closePrice is typical\n` +
        `- If you see duplicate column names (like "Prix"), use POSITION to distinguish:\n` +
        `  * First "Prix" after entryDate = entryPrice\n` +
        `  * Second "Prix" after closeDate = closePrice\n` +
        `- Look for logical sequences: Date → Price → Date → Price\n` +
        `- Analyze data patterns:\n` +
        `  * Date columns: timestamps like "2025-09-12 09:41:09"\n` +
        `  * Price columns: decimal numbers\n` +
        `  * ID columns: unique identifiers (often numeric)\n` +
        `  * Quantity columns: trade sizes (decimal numbers)\n` +
        `  * PnL columns: profit/loss amounts (can be negative)\n\n` +
        `IMPORTANT: For duplicate column names, you MUST include the column position (1-based index) in your response.\n` +
        `Format: "ColumnName_Position" (e.g., "Prix_1", "Prix_2")\n\n` +
        `Map each column by providing the matching column name with position for each database field. Use column position and context to resolve duplicates. If unsure or no match exists, use null for the field.\n\n` +
        `Column order and context:\n` +
        fieldColumns
          .map((col: string, index: number) => `${index + 1}. ${col}`)
          .join("\n") +
        "\n\n" +
        `Sample data (first few rows):\n` +
        firstRows
          .map(
            (row: Record<string, string>, index: number) =>
              `Row ${index + 1}: ${Object.entries(row)
                .map(([col, val]) => `${col}: "${val}"`)
                .join(", ")}`,
          )
          .join("\n"),
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Error in mappings route:", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate mappings" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

