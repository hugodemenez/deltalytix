"use server";

import { openai } from "@ai-sdk/openai";
import { streamObject } from "ai";
import { createStreamableValue } from "ai/rsc";
import { z } from "zod";

export async function generateCsvMapping(
  fieldColumns: string[],
  firstRows: Record<string, string>[],
) {
  const stream = createStreamableValue<Record<string, string | undefined>>();

  (async () => {
    const { partialObjectStream } = await streamObject({
      model: openai("gpt-4o-mini"),
      schema: z.object({
        accountNumber: z
          .string()
          .optional()
          .describe("The account number or name associated with the trade"),
        instrument: z
          .string()
          .describe("The trading instrument (e.g., stock symbol, ticker)"),
        entryId: z
          .string()
          .optional()
          .describe("The unique identifier for the buy transaction"),
        closeId: z
          .string()
          .optional()
          .describe("The unique identifier for the sell transaction"),
        quantity: z
          .string()
          .describe("The number of units traded"),
        entryPrice: z
          .string()
          .describe("The price at which the instrument was bought"),
        closePrice: z
          .string()
          .describe("The price at which the instrument was sold"),
        entryDate: z
          .string()
          .describe("The date when the entry / buy (if no side is provided) transaction occurred"),
        closeDate: z
          .string()
          .describe("The date when the close / sell (if no side is provided) transaction occurred"),
        pnl: z
          .string()
          .describe("The profit or loss from the trade brut or gross pnl when there is commission"),
        timeInPosition: z
          .string()
          .optional()
          .describe("The duration for which the position was held"),
        side: z
          .string()
          .optional()
          .describe("The entry side of the trade (e.g., buy or sell)"),
        commission: z
          .string()
          .optional()
          .describe("The commission charged for the trade"),
      }),
      prompt:
        `The following columns are the headings from a CSV import file for a trading system. ` +
        `Map these column names to the correct fields in our database (accountNumber, instrument, entryId, closeId, quantity, entryPrice, closePrice, entryDate, closeDate, pnl, timeInPosition, side, commission) by providing the matching column name for each field. ` +
        `You may also consult the first few rows of data to help you make the mapping, but you are mapping the columns, not the values. ` +
        `If you are not sure or there is no matching column, omit the value.\n\n` +
        `Columns:\n${fieldColumns.join(",")}\n\n` +
        `First few rows of data:\n` +
        firstRows.map((row) => JSON.stringify(row)).join("\n"),
      temperature: 0.2,
    });

    for await (const partialObject of partialObjectStream) {
      stream.update(partialObject);
    }

    stream.done();
  })();

  return { object: stream.value };
}