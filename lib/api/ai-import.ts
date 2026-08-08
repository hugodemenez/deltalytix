import { generateObject } from "ai"
import { openai } from "@ai-sdk/openai"
import { z } from "zod/v3"
import { tradeSchema } from "@/app/api/ai/format-trades/schema"
import { mappingSchema } from "@/app/api/ai/mappings/schema"
import { createTradeWithDefaults } from "@/lib/trade-factory"
import type { Trade } from "@/prisma/generated/prisma/client"

const mappingPrompt = (
  fieldColumns: string[],
  firstRows: Record<string, string>[],
) =>
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
  `Map each column by providing the matching column name for each database field. If unsure or no match exists, use null for the field.\n\n` +
  `Column order and context:\n` +
  fieldColumns.map((col, index) => `${index + 1}. ${col}`).join("\n") +
  "\n\n" +
  `Sample data (first few rows):\n` +
  firstRows
    .map(
      (row, index) =>
        `Row ${index + 1}: ${Object.entries(row)
          .map(([col, val]) => `${col}: "${val}"`)
          .join(", ")}`,
    )
    .join("\n")

const formatSystemPrompt = `
You are a trading expert.
You are given a list of trade data and you need to format it according to the schema.
Rules for formatting:
Do not make up any information. Use ONLY the data provided in the input.

1. Instrument names - Apply these transformations:
  - CFD Instruments (crypto, forex, commodities): KEEP FULL NAMES
  - Futures with .cash suffix: REMOVE .cash suffix
  - Futures contracts with month/year codes: TRIM to base symbol
  - Continuous contracts with .c suffix: REMOVE .c suffix
  - Stocks and other instruments: KEEP AS-IS

2. Convert all numeric values to numbers (remove currency symbols, commas)
3. Convert dates to ISO strings
4. If accountNumber is provided, use it as the accountNumber
5. Determine trade side based on provided values (normalize buy/long/b to long, sell/short/s to short)
6. Convert time in position to seconds
7. PnL should be the actual monetary profit/loss amount
8. Handle missing values appropriately — only populate fields that have actual data
`

export async function aiNormalizeTrades(params: {
  headers: string[]
  objects: Record<string, string>[]
  accountNumber: string
}): Promise<Trade[]> {
  const { headers, objects, accountNumber } = params
  if (objects.length === 0) return []

  const sample = objects.slice(0, 5)
  const { object: mapping } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema: mappingSchema,
    prompt: mappingPrompt(headers, sample),
    temperature: 0.1,
  })

  const batchSize = 50
  const trades: Trade[] = []

  for (let i = 0; i < objects.length; i += batchSize) {
    const batch = objects.slice(i, i + batchSize)
    const rows = batch.map((obj) => headers.map((h) => obj[h] ?? ""))

    const { object } = await generateObject({
      model: openai("gpt-4o-mini-2024-07-18"),
      schema: z.array(tradeSchema),
      system: formatSystemPrompt,
      prompt: `
Format the following ${rows.length} trades data.
Headers: ${headers.join(", ")}
Suggested column mapping: ${JSON.stringify(mapping)}
Forced accountNumber: ${accountNumber}
Rows:
${rows.map((row) => row.join(", ")).join("\n")}
`,
      temperature: 0.1,
    })

    for (const trade of object) {
      trades.push(
        createTradeWithDefaults({
          ...trade,
          accountNumber: trade.accountNumber || accountNumber,
          tags: ["ai-import"],
        }) as Trade,
      )
    }
  }

  return trades
}
