import { openai } from "@ai-sdk/openai";
import { streamObject } from "ai";
import { NextRequest } from "next/server";
import { tradeSchema } from "./schema";
import { z } from 'zod/v3';

export const maxDuration = 30;

const requestSchema = z.object({
  headers: z.array(z.string()),
  rows: z.array(z.array(z.string())).max(100, "Too many rows to process")
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { headers, rows } = requestSchema.parse(body);
console.log(headers, rows);

    const result = streamObject({
      model: openai("gpt-4o-mini-2024-07-18"),
      schema: tradeSchema,
      output: 'array',
      system:`
      You are a trading expert.
      You are given a list of trade data and you need to format it according to the schema.
      Rules for formatting:
      Do not make up any information. Use ONLY the data provided in the input.
      
      1. Instrument names - Apply these transformations:
        - CFD Instruments (crypto, forex, commodities): KEEP FULL NAMES
          * BTCUSD → BTCUSD (NOT BTC)
          * XAUUSD → XAUUSD (NOT XAU)
          * EURNZD → EURNZD (NOT EUR)
          * GBPNZD → GBPNZD (NOT GBP)
          * XAGUSD → XAGUSD (NOT XAG)
          * XPTUSD → XPTUSD (NOT XPT)
          * XPDUSD → XPDUSD (NOT XPD)
          * ADAUSD → ADAUSD (NOT ADA)
          * SOLUSD → SOLUSD (NOT SOL)
        - Futures with .cash suffix: REMOVE .cash suffix
          * US100.cash → US100
          * AUS200.cash → AUS200
          * GER40.cash → GER40
          * FRA40.cash → FRA40
          * JP225.cash → JP225
          * USOIL.cash → USOIL
        - Futures contracts with month/year codes: TRIM to base symbol
          * ESZ5 → ES
          * NQZ5 → NQ
          * CLZ5 → CL
          * GCZ5 → GC
        - Continuous contracts with .c suffix: REMOVE .c suffix
          * SOYBEAN.c → SOYBEAN
          * SUGAR.c → SUGAR
          * COFFEE.c → COFFEE
          * COTTON.c → COTTON
        - Stocks and other instruments: KEEP AS-IS
          * T → T
          * AAPL → AAPL
      
      2. Convert all numeric values to numbers (remove currency symbols, commas)
      
      3. Convert dates to ISO strings
      
      4. If accountNumber is provided, use it as the accountNumber
      
      5. Determine trade side based on:
         - If side is provided: use it directly (normalize 'buy'/'long'/'b' to 'long', 'sell'/'short'/'s' to 'short')
         - If not provided: determine from entry/close dates and prices when available
      
      6. Convert time in position to seconds
      
      7. PnL (Profit/Loss) mapping - CRITICAL:
         - Use the "Profit" column for PnL values, NOT "Pips"
         - PnL should be the actual monetary profit/loss amount
         - Pips are price movement units, not monetary values
         - If "Profit" column exists, use that value directly
         - Do NOT calculate or estimate PnL - use only the provided data
      
      8. Handle missing values appropriately:
        - If a required field is missing from the data, omit it rather than making up values
        - Only populate fields that have actual data in the input
      
      9. Required fields (only if data is available):
        - entryPrice (string)
        - closePrice (string)
        - commission (number) can be 0 if not available
        - quantity (number)
        - pnl (number) - use "Profit" column, not "Pips"
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