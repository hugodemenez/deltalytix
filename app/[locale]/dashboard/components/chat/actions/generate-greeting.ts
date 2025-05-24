'use server'
import { getTrades } from '@/server/database';
import { openai } from '@ai-sdk/openai';
import { Trade } from '@prisma/client';
import { generateText } from 'ai';
import { isSameDay, isSameMonth, isSameWeek } from 'date-fns';

function generateTradeSummary(trades: Trade[]) {
    const today = new Date();
    // generate a summary of the trades for the day, week and month
    const dayTrades = trades.filter((trade) => {
        const tradeDate = new Date(trade.entryDate);
        return isSameDay(tradeDate, today);
    });
    const weekTrades = trades.filter((trade) => {
        const tradeDate = new Date(trade.entryDate);
        return isSameWeek(tradeDate, today);
    });
    const monthTrades = trades.filter((trade) => {
        const tradeDate = new Date(trade.entryDate);
        return isSameMonth(tradeDate, today);
    });
    // Generate a summary of the trades for the day, week and month
    const dayPnlSummary = dayTrades.reduce((acc, trade) => acc + trade.pnl - trade.commission, 0);
    const weekPnlSummary = weekTrades.reduce((acc, trade) => acc + trade.pnl - trade.commission, 0);
    const monthPnlSummary = monthTrades.reduce((acc, trade) => acc + trade.pnl - trade.commission, 0);
    const dayTradeCount = dayTrades.length;
    const weekTradeCount = weekTrades.length;
    const monthTradeCount = monthTrades.length;
    return {
        currentDayPnl: dayPnlSummary,
        currentDayTradeCount: dayTradeCount,
        currentWeekPnl: weekPnlSummary,
        currentWeekTradeCount: weekTradeCount,
        currentMonthPnl: monthPnlSummary,
        currentMonthTradeCount: monthTradeCount,
    };
}

export async function generateGreeting(locale: string, username: string, date: string) {
    console.log('generateGreeting', locale, username, date)
    const trades = await getTrades();
    const tradeSummary = generateTradeSummary(trades);
    const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const { text } = await generateText({
        model: openai('gpt-4o-mini'),
        prompt: `
        You are a friendly and supportive trading psychology coach. Create a natural, engaging greeting that shows interest in the trader's day.
        You MUST respond in ${locale} language.

        If the trader has no trades for the day, week or month, help them to get started.
        If during weekend, it can be a good time to reflect on the week and plan for the next week.

        Context:
        ${username ? `- Trader: ${username}` : ''} - Current date: ${date} - Current day of the week: ${dayOfWeek}

        Summary of trades:
        ${JSON.stringify(tradeSummary)}
    `
    });

    return text;
}