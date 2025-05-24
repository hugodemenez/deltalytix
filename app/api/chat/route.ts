import { streamText } from "ai";
import { NextRequest } from "next/server";
import { Trade as PrismaTrade } from "@prisma/client";
import { groupBy } from "@/lib/utils";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { z } from "zod";
import { getTrades } from "@/server/database";
import { openai } from "@ai-sdk/openai";

export const maxDuration = 30;

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

export async function POST(req: NextRequest) {
  try {
    const { messages, username, locale } = await req.json();

    const result = streamText({
      model: openai("gpt-4o-mini"),
      system: `
      You are a friendly and supportive trading psychology coach. Create a natural, engaging greeting that shows interest in the trader's day.
      You MUST respond in ${locale} language.

      Context:
      ${username ? `- Trader: ${username}` : ''} - Current date: ${new Date().toISOString()}

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
    `,
      toolCallStreaming: true,
      messages: messages,
      maxSteps: 5,
      tools: {
        // server-side tool with execute function:
        getTradeDetails: {
          description: 'Only use this tool if the user asks for trade details. Get trade details for a maximum of 10 trades with specific filters',
          parameters: z.object({
            instrument: z.string().describe('Instrument').optional(),
            startDate: z.string().describe('Date string in format 2025-01-14T14:33:01.000Z').optional(),
            endDate: z.string().describe('Date string in format 2025-01-14T14:33:01.000Z').optional(),
            accountNumber: z.string().describe('Account number').optional(),
            side: z.string().describe('Side').optional(),
          }),
          execute: async ({ instrument, startDate, endDate, accountNumber, side }: { instrument: string, startDate: string, endDate: string, accountNumber: string, side: string }) => {
            console.log(`[getTradeDetails] instrument: ${instrument}, startDate: ${startDate}, endDate: ${endDate}, accountNumber: ${accountNumber}, side: ${side}`)
            let trades = await getTrades();
            if (accountNumber) {
              trades = trades.filter(trade => trade.accountNumber === accountNumber);
            }
            if (instrument) {
              trades = trades.filter(trade => trade.instrument === instrument);
            }
            if (startDate) {
              trades = trades.filter(trade => trade.entryDate >= startDate);
            }
            if (endDate) {
              trades = trades.filter(trade => trade.entryDate <= endDate);
            }
            if (side) {
              trades = trades.filter(trade => trade.side === side);
            }
            return trades.slice(0, 10).map(trade => ({
              accountNumber: trade.accountNumber,
              instrument: trade.instrument,
              entryDate: trade.entryDate,
              closeDate: trade.closeDate,
              pnl: trade.pnl,
              commission: trade.commission,
              side: trade.side,
              quantity: trade.quantity,
              entryPrice: trade.entryPrice,
              closePrice: trade.closePrice,
              images: [trade.imageBase64,trade.imageBase64Second],
            }));
          },
        },
        getTradeSummary: {
          description: 'Get trades between two dates',
          parameters: z.object({
            startDate: z.string().describe('Date string in format 2025-01-14T14:33:01.000Z'),
            endDate: z.string().describe('Date string in format 2025-01-14T14:33:01.000Z')
          }),
          execute: async ({ startDate, endDate }: { startDate: string, endDate: string }) => {
            console.log(`[getTradeSummary] startDate: ${startDate}, endDate: ${endDate}`)
            const trades = await getTrades();
            const start = new Date(startDate);
            const end = new Date(endDate);
            const filteredTrades = trades.filter(trade => {
              const tradeDate = new Date(trade.entryDate);
              return tradeDate >= start && tradeDate <= end;
            });
            return generateTradeSummary(filteredTrades);
          },
        },
        // client-side tool that starts user interaction:
        askForConfirmation: {
          description: 'Ask the user for confirmation to perform specific actions explaining your thoughts.',
          parameters: z.object({
            message: z.string().describe('The message to ask for confirmation. Explaining what next actions are'),
          }),
          execute: async ({ message }: { message: string }) => {
            console.log(`[askForConfirmation] message: ${message}`)
            return {
              message: message,
              state: 'call'
            };
          },
        },
        // client-side tool that is automatically executed on the client:
        getLocation: {
          description:
            'Get the user location. Always ask for confirmation before using this tool.',
          parameters: z.object({}),
        },
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