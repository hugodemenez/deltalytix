import { streamText } from "ai";
import { NextRequest } from "next/server";
import { z } from "zod";
import { openai } from "@ai-sdk/openai";
import { getFinancialNews } from "./tools/get-financial-news";
import { getJournalEntries } from "./tools/get-journal-entries";
import { getMostTradedInstruments } from "./tools/get-most-traded-instruments";
import { getLastTradesData } from "./tools/get-last-trade-data";
import { getTradesDetails } from "./tools/get-trades-details";
import { getTradesSummary } from "./tools/get-trades-summary";
import { askForLocation } from "./tools/ask-for-location";
import { askForConfirmation } from "./tools/ask-for-confirmation";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
      const { messages, username, locale, timezone } = await req.json();

    const result = streamText({
      model: openai("gpt-4o-mini"),
      
      system: `
      You are a friendly and supportive trading psychology coach. Create a natural, engaging greeting that shows interest in the trader's day.
      You MUST respond in ${locale} language or follow the user's conversation language.

      Context:
      ${username ? `- Trader: ${username}` : ''} - Current date: ${new Date().toISOString()} - User timezone: ${timezone}

      Guidelines:
      - Always look at the user's journal entries to understand their mood and trading patterns
      - Always use Markdown to format your response
      - Vary your response types naturally:
        * Share observations about their trading patterns
        * Offer gentle insights when appropriate
        * Ask thoughtful questions when relevant
        * Acknowledge and validate their experiences
        * Provide supportive comments
      - Be conversational and empathetic
      - Reference specific trading data when relevant
      - Avoid being overly formal or repetitive
      - Don't force a question into every response
    `,
      toolCallStreaming: true,
      messages: messages,
      maxSteps: 5,
      tools: {
        // server-side tool with execute function
        getJournalEntries,
        getMostTradedInstruments,
        getLastTradesData,
        getTradesDetails,
        getTradesSummary,
        getFinancialNews,
        // client-side tool that is automatically executed on the client
        askForConfirmation,
        askForLocation,
      },
    });
    return result.toDataStreamResponse();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify({ error: error.errors }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    console.error("Error in chat route:", error);
    return new Response(JSON.stringify({ error: "Failed to process chat" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
} 