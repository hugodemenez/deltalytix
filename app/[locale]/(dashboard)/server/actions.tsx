'use server';

import { getMutableAIState, streamUI } from 'ai/rsc';
import { openai } from "@ai-sdk/openai";
import { ReactNode } from 'react';
import { z } from 'zod';
import { generateId, streamObject } from 'ai';
import { groupBy } from '@/lib/utils';
import AIPNLChart from '../components/ai-pnl-chart';

export interface ServerMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ClientMessage {
  id: string;
  role: 'user' | 'assistant';
  display: ReactNode;
}

function generateAccountSummaries(trades: any[]) {
  const accountGroups = groupBy(trades, 'accountNumber');
  return Object.entries(accountGroups).map(([accountNumber, trades]) => {
    const accountPnL = trades.reduce((sum: number, trade: any) => sum + trade.pnl, 0);
    const accountCommission = trades.reduce((sum: number, trade: any) => sum + trade.commission, 0);
    const longTrades = trades.filter((t: any) => t.side === 'long')!.length;
    const shortTrades = trades.filter((t: any) => t.side === 'short')!.length;
    return `Account ${accountNumber}: PnL: $${(accountPnL - accountCommission).toFixed(2)}, Commission: $${accountCommission.toFixed(2)}, Long: ${longTrades}, Short: ${shortTrades}`;
  }).join('\n');
}

function generateTradeSummaries(trades: any[]) {
  return trades.map(t => `${t.instrument} (${t.side}, Account ${t.accountNumber}), Time: ${t.entryDate}, PnL: $${t.pnl}`).join(', ');
}

export async function continueConversation(
  input: string,
  dayData: any,
  dateString: string,
): Promise<ClientMessage> {
  'use server';

  if (!dayData || !dayData.trades) {
    return {
      id: generateId(),
      role: 'assistant',
      display: <div>No trades available</div>,
    };
  }

  const history = getMutableAIState();


  const accountSummaries = generateAccountSummaries(dayData.trades);
  const tradeSummaries = generateTradeSummaries(dayData.trades);

  const result = await streamUI({
    model: openai("gpt-3.5-turbo"),
    messages: [
      {
        role: 'system',
        content: `
          You are an AI assistant specializing in trading psychology and performance analysis on Deltalytix, a comprehensive trading journal and statistics platform. Your role is to provide insightful, concise, and personalized feedback to traders based on their daily performance across multiple accounts.

          Guidelines:
          - Keep responses brief and focused, typically 1-2 sentences.
          - Make questions thought-provoking but concise, considering performance across different accounts.
          - Use emojis sparingly to keep the conversation engaging and professional.
          - Be responsive to the user's input, acknowledging new information.
          - Provide insights directly related to the user's input or trading data across accounts.
          - Avoid repeating previous questions or topics.
          - Consider the multi-account nature of trading on Deltalytix in your analysis.

          Trading data for ${dateString}:
          Account Summaries:
          ${accountSummaries}
          
          Trades: ${tradeSummaries}
        `
      },
      ...history.get(),
      { role: 'user', content: input }
    ],
    text: ({ content, done }) => {
      if (done) {
        history.done((messages: ServerMessage[]) => [
          ...messages,
          { role: 'assistant', content },
        ]);
      }

      return <div>{content}</div>;
    },
    tools: {
      showPNLChart: {
        description: 'Show the PNL bar chart for a specific instrument and account on the current trading day',
        parameters: z.object({
          instrument: z
            .string()
            .describe('The instrument to show the PNL chart for'),
          accountNumber: z
            .string()
            .describe('The account number to show the PNL chart for'),
        }),
        generate: async ({ instrument, accountNumber }) => {
          history.done((messages: ServerMessage[]) => [
            ...messages,
            {
              role: 'assistant',
              content: `Here's the PNL chart for ${instrument} on account ${accountNumber} for ${dateString}:`,
            },
          ]);

          return <AIPNLChart instrument={instrument} accountNumber={accountNumber} date={dateString} />;
        },
      },
    },
  });

  return {
    id: generateId(),
    role: 'assistant',
    display: result.value,
  };
}

export async function generateQuestionSuggestions(dayData: any, dateString: string): Promise<string[]> {
  'use server';

  if (!dayData || !dayData.trades) {
    return getDefaultQuestions();
  }

  const accountSummaries = generateAccountSummaries(dayData.trades);
  const tradeSummaries = generateTradeSummaries(dayData.trades);

  try {
    const { partialObjectStream } = await streamObject({
      model: openai("gpt-3.5-turbo"),
      schema: z.object({
        questions: z.array(z.string()).describe("Three concise, thought-provoking questions based on the trading data"),
      }),
      prompt: `
        You are an AI assistant specializing in trading psychology and performance analysis.
        Generate 3 concise, thought-provoking questions based on the provided trading data.
        Make sure to reference specific data points in the questions.
        Each question should be no longer than 15 words.

        Trading data for ${dateString}:
        Account Summaries:
        ${accountSummaries}
        
        Trades: ${tradeSummaries}

        Please provide three question suggestions based on the trading data.
      `,
      temperature: 0.7,
    });

    let questions: string[] = [];

    for await (const partialObject of partialObjectStream) {
      if (partialObject.questions && Array.isArray(partialObject.questions)) {
        questions = partialObject.questions.filter((q): q is string => typeof q === 'string');
      }
    }

    return questions.length >= 3 ? questions.slice(0, 3) : getDefaultQuestions();
  } catch (error) {
    console.error("Error generating question suggestions:", error);
    return getDefaultQuestions();
  }
}

function getDefaultQuestions(): string[] {
  return [
    "How did your trading performance vary across different accounts today?",
    "What factors contributed to your most successful trades?",
    "How can you improve your risk management based on today's results?"
  ];
}
