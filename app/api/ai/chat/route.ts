import { streamText } from "ai";
import { NextRequest } from "next/server";
import { Trade as PrismaTrade } from "@prisma/client";
import { groupBy } from "@/lib/utils";
import { z } from "zod";
import { getTradesAction } from "@/server/database";
import { openai } from "@ai-sdk/openai";
import { getFinancialEvents } from "@/server/financial-events";
import { createNewsTool } from "./tools/news";
import { getMoodHistory } from "@/server/journal";

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
      const { messages, username, locale, timezone } = await req.json();

    const result = streamText({
      model: openai("gpt-4o-mini"),
      
      system: `
      You are a friendly and supportive trading psychology coach. Create a natural, engaging greeting that shows interest in the trader's day.
      You MUST respond in ${locale} language or follow the user's conversation language.

      Context:
      ${username ? `- Trader: ${username}` : ''} - Current date: ${new Date().toISOString()} - User timezone: ${timezone}

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
        getJournalEntries:{
          description: 'Get journal entries from a given date',
          parameters: z.object({
            fromDate: z.string().describe('Date in format 2025-01-14'),
            toDate: z.string().describe('Date in format 2025-01-14').optional(),
          }),
          execute: async ({fromDate, toDate}: {fromDate: string, toDate?: string}) => {
            const journalEntries = await getMoodHistory(new Date(fromDate), toDate ? new Date(toDate) : undefined);
            return journalEntries.map(entry => ({
              date: entry.day,
              mood: entry.mood,
              journal:entry.journalContent,
            }));
          }
        },
        getMostTradedInstruments: {
          description: 'Get the most traded instruments',
          parameters: z.object({}),
          execute: async () => {
            let trades = await getTradesAction();
            let instruments = trades.map(trade => trade.instrument);
            let instrumentCount = instruments.reduce((acc, instrument) => {
              acc[instrument] = (acc[instrument] || 0) + 1;
              return acc;
            }, {} as Record<string, number>);
            return Object.entries(instrumentCount).sort((a, b) => b[1] - a[1]).map(([instrument, count]) => ({ instrument, count }));
          }
        },
        getLastTradesData:{
          description: `
          Get X last trades from user can be useful to understand which instrument he is currently trading or trading time,
          make sure to provide an accountNumber because trades are grouped by accountNumber
          `,
          parameters: z.object({
            number: z.number().describe('Number of trades to retrieve'),
            accountNumber: z.string().describe('Account number').optional(),
          }),
          execute: async({number, accountNumber}) => {
            console.log(`Getting last ${number} trade(s)`)
            let trades = await getTradesAction();
            if (accountNumber) {
              trades = trades.filter(trade => trade.accountNumber === accountNumber);
            }
            trades = trades.sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime());
            trades = trades.slice(0, number);
            return trades;
          }
        },
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
            let trades = await getTradesAction();
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
            const trades = await getTradesAction();
            const start = new Date(startDate);
            const end = new Date(endDate);
            const filteredTrades = trades.filter(trade => {
              const tradeDate = new Date(trade.entryDate);
              return tradeDate >= start && tradeDate <= end;
            });
            return generateTradeSummary(filteredTrades);
          },
        },
        news: createNewsTool(locale),
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