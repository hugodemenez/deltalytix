'use server';

import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import React, { ReactNode } from 'react';
import { generateId } from 'ai';
import { groupBy } from '@/lib/utils';
import { Trade as PrismaTrade } from '@prisma/client';

export interface ServerMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ClientMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  display: ReactNode;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date);
}

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
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

export async function getInitialGreeting(
  todayTrades: PrismaTrade[],
  weekTrades: PrismaTrade[],
  username?: string
): Promise<ClientMessage> {
  'use server';
  
  const timeOfDay = getTimeOfDay();
  const todaySummary = generateTradeSummary(todayTrades);
  const weekSummary = generateTradeSummary(weekTrades);
  const model = openai.chat('gpt-3.5-turbo');
  
  const { text } = await generateText({
    model,
    messages: [
      {
        role: 'system',
        content: `
          You are a trading psychology coach. Create a brief, engaging greeting that leads to understanding the trader's mindset.

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

          Guidelines:
          - Keep it under 2 sentences
          - Start with "Good ${timeOfDay}"
          - End with a focused question about their trading mindset or emotional state
          - If they have trades today, reference their activity level or P&L trend
          - If no trades today but trades this week, mention weekly context
          - If no trades at all, ask about their preparation or strategy
        `
      }
    ],
    temperature: 0.7,
    maxTokens: 100,
  });

  return {
    id: generateId(),
    role: 'system',
    display: React.createElement('div', null, text),
  };
}

export async function continueWidgetConversation(
  input: string,
  todayTrades: PrismaTrade[],
  weekTrades: PrismaTrade[],
  conversationHistory: ServerMessage[] = []
): Promise<ClientMessage> {
  'use server';

  if (!todayTrades && !weekTrades) {
    return {
      id: generateId(),
      role: 'assistant',
      display: React.createElement('div', null, 'No trades available'),
    };
  }

  const todaySummary = generateTradeSummary(todayTrades);
  const weekSummary = generateTradeSummary(weekTrades);
  const model = openai.chat('gpt-3.5-turbo');

  const { text } = await generateText({
    model,
    messages: [
      {
        role: 'system',
        content: `
          You are a trading psychology coach focused on understanding and improving trader mindset.

          Trading Context:
          Today's Performance:
          ${todaySummary.map(summary => 
            `Account ${summary.accountNumber}: ${summary.tradeCount} trades, P&L: $${summary.pnl.toFixed(2)}`
          ).join('\n')}

          This Week's Performance:
          ${weekSummary.map(summary => 
            `Account ${summary.accountNumber}: ${summary.tradeCount} trades, P&L: $${summary.pnl.toFixed(2)}`
          ).join('\n')}

          Guidelines:
          - Keep responses to 1-2 short sentences
          - Focus on emotional state, decision-making, and trading psychology
          - Ask insightful questions about their trading process or emotional response
          - Be supportive but direct
          - Avoid generic advice
          - Reference both daily and weekly context when relevant
        `
      },
      ...conversationHistory,
      { role: 'user', content: input }
    ],
    temperature: 0.7,
    maxTokens: 100,
  });

  return {
    id: generateId(),
    role: 'assistant',
    display: React.createElement('div', null, text),
  };
} 