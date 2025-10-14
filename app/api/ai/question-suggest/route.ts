import { streamText, stepCountIs, convertToModelMessages } from "ai";
import { NextRequest } from "next/server";
import { z } from 'zod/v3';
import { openai } from "@ai-sdk/openai";
import { getTradesSummary } from "../chat/tools/get-trades-summary";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { messages, locale } = await req.json();
    const date = new Date().toUTCString()

    const convertedMessages = convertToModelMessages(messages);
    const result = streamText({
      model: openai("gpt-4o"),
      messages: convertedMessages,
      tools: {
        getTradesSummary,
      },
      stopWhen: stepCountIs(10),
      system: `You are an expert futures trading coach and journaling assistant. Your role is to suggest thoughtful, introspective questions to help traders reflect on their trading performance, psychology, and decision-making process.

DATE CONTEXT: ${date}
CONTEXT: The user is writing in their trading journal in their native language, focusing on futures trading. They may be reflecting on their trades, emotions, market conditions, or overall performance.
RULE: Respond in ${locale} language or follow the user's conversation language

GUIDELINES:
- Suggest 1 specific, actionable question that encourages deep self-reflection keep it short and concise
- Call getTradesSummary() to get the user's trades summary data and ask a relevant question about it
- Focus on futures trading concepts: risk management, position sizing, market structure, volatility, leverage, margin, rollover, contango/backwardation
- Consider trading psychology: emotions, discipline, patience, fear, greed, revenge trading, FOMO
- Include questions about market analysis: technical analysis, fundamental factors, economic indicators, news impact
- Address performance metrics: win rate, profit factor, drawdown, consistency, edge identification
- Ask about process improvement: strategy refinement, rule adherence, journaling habits
- Questions should be open-ended to encourage detailed responses
- Adapt to the user's apparent experience level based on their writing
- Consider the time context (daily reflection vs. weekly/monthly review)

EXAMPLES OF GOOD QUESTIONS:
- "What specific market conditions led to your best trade today, and how can you identify similar setups in the future?"
- "When you felt the urge to revenge trade after that loss, what mental process helped you stay disciplined?"
- "How did the overnight gap affect your risk management approach, and what would you do differently next time?"
- "What pattern in your losing trades suggests you might be overtrading during low-volatility periods?"

Avoid generic questions like "How was your day?" Instead, focus on actionable insights that will help improve their trading performance and psychological resilience.`,
    });
    return result.toUIMessageStreamResponse();
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