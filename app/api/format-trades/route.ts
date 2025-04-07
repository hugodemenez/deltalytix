import { openai } from "@ai-sdk/openai";
import { streamObject } from "ai";
import { z } from "zod";
import { NextRequest } from "next/server";
import { Trade } from "@prisma/client";

const TradeSchema = z.object({
  quantity: z.number().describe("The number of units traded"),
  pnl: z.number().describe("The profit or loss from the trade"),
  commission: z.number().describe("The commission charged for the trade or 0 if not available"),
  timeInPosition: z.number().describe("The duration for which the position was held in seconds"),
  side: z.enum(["long", "short"]).describe("The direction of the trade"),
  entryDate: z.string().describe("The ISO string date when the entry transaction occurred"),
  closeDate: z.string().describe("The ISO string date when the close transaction occurred"),
  instrument: z.string().describe("The trading instrument (e.g. MES, ES, NG, ZN, ZB, etc.)"),
  accountNumber: z.string().describe("The account number associated with the trade"),
  entryPrice: z.string().describe("The price at which the instrument was bought"),
  closePrice: z.string().describe("The price at which the instrument was sold"),
  entryId: z.string().optional().describe("The unique identifier for the entry transaction"),
  closeId: z.string().optional().describe("The unique identifier for the close transaction"),
});

export async function POST(req: NextRequest) {
  try {
    const { headers, rows, mappings } = await req.json();
    if (rows.length > 100) {
      return new Response(JSON.stringify({ error: "Too many rows to process" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const { partialObjectStream } = await streamObject({
            model: openai("gpt-4o-mini"),
            schema: z.object({
              trades: z.array(TradeSchema.partial()).describe("Array of formatted trades"),
            }),
            prompt: `
              Format the following trade data according to the schema, processing fields incrementally as you go.
              Headers: ${headers.join(", ")}
              Column mappings: ${JSON.stringify(mappings)}
              
              Rows:
              ${rows.map((row: string[]) => row.join(", ")).join("\n")}
              
              Total rows to process: ${rows.length}

              Rules for formatting:
              1. Convert all numeric values to numbers (remove currency symbols, commas)
              2. Convert dates to ISO strings
              3. Determine trade side based on:
                 - If side is provided: use it directly (normalize 'buy'/'long'/'b' to 'long', 'sell'/'short'/'s' to 'short')
                 - If not provided: determine from entry/close dates and prices when available
              4. Convert time in position to seconds
              5. Handle missing values appropriately:
                 - Omit missing fields until they can be filled
              6. Clean and standardize instrument names (remove futures expiration date suffixes: MESH5 becomes MES, ESZ25 becomes ES, etc.)
              7. Ensure all required fields are populated:
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
            temperature: 0.1,
          });

          let allTrades: Partial<Trade>[] = Array(rows.length).fill({});

          for await (const partialObject of partialObjectStream) {
            if (partialObject.trades) {
              const partialTrades = partialObject.trades as Partial<Trade>[];
              for (let i = 0; i < partialTrades.length; i++) {
                const trade = partialTrades[i];
                if (Object.keys(trade).length > 0) {
                  allTrades[i] = { ...allTrades[i], ...trade };
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ type: "partial", index: i, data: trade })}\n\n`)
                  );
                }
              }
            }
          }

          // Send final complete array
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "complete", data: allTrades })}\n\n`)
          );
          controller.close();
        } catch (error) {
          console.error("Error in stream processing:", error);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "error", message: "Processing failed" })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    console.error("Error in format-trades route:", error);
    return new Response(JSON.stringify({ error: "Failed to format trades" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}