// app/actions/generateAIComment.ts
'use server'

import { CalendarEntry } from "@/types/calendar";
import { openai } from "@ai-sdk/openai"
import { streamObject } from "ai"
import { z } from "zod"

export async function generateAIComment(dayData: CalendarEntry, dateString: string) {
  try {
    const { partialObjectStream } = await streamObject({
      model: openai("gpt-4o-mini"),
      schema: z.object({
        comment: z.string().describe("A brief comment summarizing the day's trading performance"),
        emotion: z.string().describe("An emotion associated with the day's trading performance"),
      }),
      prompt:
        `Given the following trading data for ${dateString}:\n` +
        `Total PnL: $${dayData.pnl.toFixed(2)}\n` +
        `Number of trades: ${dayData.tradeNumber}\n` +
        `Long trades: ${dayData.longNumber}\n` +
        `Short trades: ${dayData.shortNumber}\n` +
        `Trades: ${dayData.trades.map(t => `${t.instrument} (${t.side}): $${t.pnl}`).join(', ')}\n\n` +
        `Please provide a brief comment summarizing the day's performance and an associated emotion.`,
      temperature: 0.7,
    });

    let comment = "";
    let emotion = "";

    for await (const partialObject of partialObjectStream) {
      if (partialObject.comment) comment = partialObject.comment;
      if (partialObject.emotion) emotion = partialObject.emotion;
    }

    return { comment, emotion };
  } catch (error) {
    console.error("Error generating comment:", error);
    return { comment: "Failed to generate comment", emotion: "Error" };
  }
}