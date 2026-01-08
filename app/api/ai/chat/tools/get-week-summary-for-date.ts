import { groupBy } from "@/lib/utils";
import { getTradesAction } from "@/server/database";
import { Trade } from "@/prisma/generated/prisma/client";
import { tool } from "ai";
import { z } from 'zod/v3';
import { startOfWeek, endOfWeek, format, parseISO } from "date-fns";

interface TradeSummary {
    accountNumber: string;
    pnl: number;
    commission: number;
    longTrades: number;
    shortTrades: number;
    instruments: string[];
    tradeCount: number;
}

function generateTradeSummary(trades: Trade[]): TradeSummary[] {
    if (!trades || trades.length === 0) return [];

    const accountGroups = groupBy(trades, 'accountNumber');
    return Object.entries(accountGroups).map(([accountNumber, trades]) => {
        const accountPnL = trades.reduce((sum, trade) => sum + trade.pnl, 0);
        const accountCommission = trades.reduce((sum, trade) => sum + trade.commission, 0);
        const longTrades = trades.filter(t => t.side?.toLowerCase() === 'long').length || 0;
        const shortTrades = trades.filter(t => t.side?.toLowerCase() === 'short').length || 0;
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

export const getWeekSummaryForDate = tool({
    description: 'Get trades summary for the week containing a specific date. Automatically calculates week boundaries (Monday to Sunday) for any given date.',
    inputSchema: z.object({
        date: z.string().describe('Date in format YYYY-MM-DD (e.g., "2025-01-15") or ISO format (e.g., "2025-01-15T10:30:00.000Z")')
    }),
    execute: async ({ date }: { date: string }) => {
        try {
            // Parse the input date
            const inputDate = date.includes('T') ? parseISO(date) : parseISO(date + 'T00:00:00.000Z');
            
            // Calculate week boundaries (Monday to Sunday)
            const weekStart = startOfWeek(inputDate, { weekStartsOn: 1 });
            const weekEnd = endOfWeek(inputDate, { weekStartsOn: 1 });
            
            console.log(`[getWeekSummaryForDate] Input date: ${date}, Week: ${format(weekStart, 'yyyy-MM-dd')} to ${format(weekEnd, 'yyyy-MM-dd')}`);
            
            const trades = await getTradesAction();
            const filteredTrades = trades.filter(trade => {
                const tradeDate = new Date(trade.entryDate);
                return tradeDate >= weekStart && tradeDate <= weekEnd;
            });
            
            return {
                inputDate: format(inputDate, 'yyyy-MM-dd'),
                weekPeriod: `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`,
                dateRange: {
                    start: weekStart.toISOString(),
                    end: weekEnd.toISOString(),
                    startFormatted: format(weekStart, 'yyyy-MM-dd'),
                    endFormatted: format(weekEnd, 'yyyy-MM-dd')
                },
                isCurrentWeek: format(weekStart, 'yyyy-MM-dd') === format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
                summary: generateTradeSummary(filteredTrades)
            };
        } catch (error) {
            throw new Error(`Invalid date format. Please use YYYY-MM-DD format (e.g., "2025-01-15")`);
        }
    },
}) 