import { streamText, stepCountIs, convertToModelMessages } from "ai";
import { NextRequest } from "next/server";
import { z } from 'zod/v3';
import { getFinancialNews } from "./tools/get-financial-news";
import { getJournalEntries } from "./tools/get-journal-entries";
import { getMostTradedInstruments } from "./tools/get-most-traded-instruments";
import { getLastTradesData } from "./tools/get-last-trade-data";
import { getTradesDetails } from "./tools/get-trades-details";
import { getTradesSummary } from "./tools/get-trades-summary";
import { getCurrentWeekSummary } from "./tools/get-current-week-summary";
import { getPreviousWeekSummary } from "./tools/get-previous-week-summary";
import { getWeekSummaryForDate } from "./tools/get-week-summary-for-date";
import { getPreviousConversation } from "./tools/get-previous-conversation";
import { generateEquityChart } from "./tools/generate-equity-chart";
import { startOfWeek, endOfWeek, subWeeks } from "date-fns";
import { buildSystemPrompt } from "./prompts";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
      const { messages, username, locale, timezone } = await req.json();
      console.log('[Chat Route] Received messages:', JSON.stringify(messages, null, 2));
      
      // Check if messages is valid
      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        console.error('[Chat Route] Invalid messages array:', messages);
        return new Response(JSON.stringify({ error: "No messages provided" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
    // Calculate current week and previous week boundaries in user's timezone
    const now = new Date();
    const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday start
    const currentWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const previousWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
    const previousWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });

    // Determine if this is the first message in the conversation
    // A conversation starts with a user message, so if there's only one user message, it's the first
    const userMessages = messages.filter((msg: any) => msg.role === 'user');
    const isFirstMessage = userMessages.length === 1;

    const convertedMessages = await convertToModelMessages(messages);
    const systemPrompt = buildSystemPrompt({
      locale,
      username,
      timezone,
      currentWeekStart,
      currentWeekEnd,
      previousWeekStart,
      previousWeekEnd,
      isFirstMessage,
    });

    const result = streamText({
      model: 'openai/gpt-5-mini',
      messages: convertedMessages,
      system: systemPrompt,

      stopWhen: stepCountIs(10),
      
      onStepFinish: (step) => {
        console.log('[Chat Route] Step finished:', JSON.stringify({
          finishReason: step.finishReason,
          hasText: !!step.text,
          textLength: step.text?.length,
          toolCalls: step.toolCalls?.map(tc => tc.toolName),
          hasToolResults: !!step.toolResults?.length
        }, null, 2));
      },

      tools: {
        // server-side tool with execute function
        getJournalEntries,
        getPreviousConversation,
        getMostTradedInstruments,
        getLastTradesData,
        getTradesDetails,
        getTradesSummary,
        getCurrentWeekSummary,
        getPreviousWeekSummary,
        getWeekSummaryForDate,
        getFinancialNews,
        generateEquityChart,
        // client-side tool that is automatically executed on the client
        // askForConfirmation,
        // askForLocation,
      },
      
      onError: ({ error }) => {
        console.error('[Chat Route] Stream error:', error);
      },
      
      onFinish: (result) => {
        console.log('[Chat Route] Stream finished:', JSON.stringify({
          finishReason: result.finishReason,
          hasText: !!result.text,
          textLength: result.text?.length,
          stepsCount: result.steps?.length,
          usage: result.usage
        }, null, 2));
      }
    });
    return result.toUIMessageStreamResponse({
      onError: (error) => {
        console.error('[Chat Route] UI Stream error:', error);
        return 'An error occurred during the chat response';
      }
    });
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