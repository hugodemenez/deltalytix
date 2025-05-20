import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { NextRequest } from "next/server";
import { Trade as PrismaTrade } from "@prisma/client";
import { groupBy } from "@/lib/utils";
import { getCurrentLocale } from "@/locales/server";

interface SavedMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface MoodHistoryEntry {
  date: string;
  mood: string;
  conversation: SavedMessage[];
}

interface TradeSummary {
  accountNumber: string;
  pnl: number;
  commission: number;
  longTrades: number;
  shortTrades: number;
  instruments: string[];
  tradeCount: number;
}

function generateTradeSummary(trades: PrismaTrade[]): TradeSummary[] {
  if (!trades || trades.length === 0) return [];

  const accountGroups = groupBy(trades, 'accountNumber');
  return Object.entries(accountGroups).map(([accountNumber, trades]) => {
    const accountPnL = trades.reduce((sum, trade) => sum + trade.pnl, 0);
    const accountCommission = trades.reduce((sum, trade) => sum + trade.commission, 0);
    const longTrades = trades.filter(t => t.side === 'long').length;
    const shortTrades = trades.filter(t => t.side === 'short').length;
    const instruments = [...new Set(trades.map(t => t.instrument))];
    
    return {
      accountNumber,
      pnl: accountPnL - accountCommission,
      commission: accountCommission,
      longTrades,
      shortTrades,
      instruments,
      tradeCount: trades.length
    };
  });
}

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

export async function POST(req: NextRequest) {
  try {
    const { input, todayTrades, weekTrades, monthTrades, conversationHistory, userMoodHistory, isInitialGreeting, username } = await req.json();
    const encoder = new TextEncoder();
    const locale = await getCurrentLocale();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const todaySummary = generateTradeSummary(todayTrades);
          const weekSummary = generateTradeSummary(weekTrades);
          const monthSummary = generateTradeSummary(monthTrades || []);

          let pastChatInsights = '';
          if (userMoodHistory && Array.isArray(userMoodHistory) && userMoodHistory.length > 0) {
            pastChatInsights = userMoodHistory
              .slice(-2)
              .map(entry => {
                const relevantExchanges = entry.conversation
                  .slice(-2)
                  .map((msg: SavedMessage) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content.substring(0, 75)}${msg.content.length > 75 ? '...' : ''}`)
                  .join('\n    ');
                return `- On ${entry.date} (mood: ${entry.mood}):\n    ${relevantExchanges}`;
              })
              .join('\n\n');
          }
          if (pastChatInsights) {
            pastChatInsights = `\n\nRecent Chat Snippets:\n${pastChatInsights}`;
          }

          const model = openai.chat('gpt-4.1-mini-2025-04-14');

          if (isInitialGreeting) {
            const timeOfDay = getTimeOfDay();
            const { textStream } = await streamText({
              model,
              messages: [
                {
                  role: 'system',
                  content: `
                    You are a friendly and supportive trading psychology coach. Create a natural, engaging greeting that shows interest in the trader's day.
                    You MUST respond in ${locale} language.

                    Context:
                    ${username ? `- Trader: ${username}` : ''}
                    
                    Today's Performance:
                    ${todaySummary.length > 0 
                      ? todaySummary.map(summary => 
                          `Account ${summary.accountNumber}: ${summary.tradeCount} trades, P&L: $${summary.pnl.toFixed(2)}`
                        ).join('\n')
                      : '- No trades yet today'}

                    This Week's Performance:
                    ${weekSummary.length > 0 
                      ? weekSummary.map(summary => 
                          `Account ${summary.accountNumber}: ${summary.tradeCount} trades, P&L: $${summary.pnl.toFixed(2)}`
                        ).join('\n')
                      : '- No trades this week'}

                    This Month's Performance:
                    ${monthSummary.length > 0
                      ? monthSummary.map(summary =>
                          `Account ${summary.accountNumber}: ${summary.tradeCount} trades, P&L: $${summary.pnl.toFixed(2)}`
                        ).join('\n')
                      : '- No trades this month yet'}
                    ${pastChatInsights}

                    Guidelines:
                    - Take into account past exchanges and conversations
                    - Keep it under 2-3 sentences
                    - Start with a greeting appropriate for ${timeOfDay} in ${locale} language
                    - Make it conversational and natural
                    - If they have trades today, share a brief observation about their activity or performance
                    - If no trades today but trades this week, mention the week's progress
                    - If no trades at all, express interest in their preparation
                    - End with an open-ended invitation to share their thoughts
                  `
                }
              ],
              temperature: 0.7,
              maxTokens: 150,
            });

            for await (const chunk of textStream) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "text", content: chunk })}\n\n`));
            }
          } else {
            const { textStream } = await streamText({
              model,
              messages: [
                {
                  role: 'system',
                  content: `
                    You are a supportive trading psychology coach engaging in a natural conversation.
                    You MUST respond in ${locale} language.

                    Trading Context:
                    Today's Performance:
                    ${todaySummary.map(summary => 
                      `Account ${summary.accountNumber}: ${summary.tradeCount} trades, P&L: $${summary.pnl.toFixed(2)}`
                    ).join('\n')}

                    This Week's Performance:
                    ${weekSummary.map(summary => 
                      `Account ${summary.accountNumber}: ${summary.tradeCount} trades, P&L: $${summary.pnl.toFixed(2)}`
                    ).join('\n')}

                    This Month's Performance:
                    ${monthSummary.map(summary =>
                      `Account ${summary.accountNumber}: ${summary.tradeCount} trades, P&L: $${summary.pnl.toFixed(2)}`
                    ).join('\n')}
                    ${pastChatInsights}

                    Guidelines:
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
                  `
                },
                ...conversationHistory,
                { role: 'user', content: input }
              ],
              temperature: 0.8,
              maxTokens: 500,
            });

            for await (const chunk of textStream) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "text", content: chunk })}\n\n`));
            }
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
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
    console.error("Error in chat route:", error);
    return new Response(JSON.stringify({ error: "Failed to process chat" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
} 