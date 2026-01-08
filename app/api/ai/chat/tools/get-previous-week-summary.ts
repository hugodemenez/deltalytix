import { groupBy } from "@/lib/utils";
import { getTradesAction } from "@/server/database";
import { Trade } from "@/prisma/generated/prisma/client";
import { tool } from "ai";
import { z } from 'zod/v3';
import { startOfWeek, endOfWeek, subWeeks, format } from "date-fns";

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

export const getPreviousWeekSummary = tool({
    description: 'Get trades summary for the previous week (Monday to Sunday of last week). This automatically calculates the previous week boundaries.',
    inputSchema: z.object({}),
    execute: async () => {
        const now = new Date();
        const previousWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
        const previousWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
        
        console.log(`[getPreviousWeekSummary] Previous week: ${format(previousWeekStart, 'yyyy-MM-dd')} to ${format(previousWeekEnd, 'yyyy-MM-dd')}`);
        
        const trades = await getTradesAction();
        const filteredTrades = trades.filter(trade => {
            const tradeDate = new Date(trade.entryDate);
            return tradeDate >= previousWeekStart && tradeDate <= previousWeekEnd;
        });
        
        return {
            weekPeriod: `${format(previousWeekStart, 'MMM d')} - ${format(previousWeekEnd, 'MMM d, yyyy')}`,
            dateRange: {
                start: previousWeekStart.toISOString(),
                end: previousWeekEnd.toISOString()
            },
            summary: generateTradeSummary(filteredTrades)
        };
    },
}) 