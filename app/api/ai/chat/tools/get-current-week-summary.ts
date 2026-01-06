import { groupBy } from "@/lib/utils";
import { getTradesAction } from "@/server/database";
import { Trade } from "@/prisma/generated/prisma/client";
import { tool } from "ai";
import { z } from 'zod/v3';
import { startOfWeek, endOfWeek, format } from "date-fns";

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

export const getCurrentWeekSummary = tool({
    description: 'Get trades summary for the current week (Monday to Sunday). This automatically calculates the current week boundaries.',
    inputSchema: z.object({}),
    execute: async () => {
        const now = new Date();
        const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });
        const currentWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
        
        console.log(`[getCurrentWeekSummary] Current week: ${format(currentWeekStart, 'yyyy-MM-dd')} to ${format(currentWeekEnd, 'yyyy-MM-dd')}`);
        
        const trades = await getTradesAction();
        const filteredTrades = trades.filter(trade => {
            const tradeDate = new Date(trade.entryDate);
            return tradeDate >= currentWeekStart && tradeDate <= currentWeekEnd;
        });
        
        return {
            weekPeriod: `${format(currentWeekStart, 'MMM d')} - ${format(currentWeekEnd, 'MMM d, yyyy')}`,
            dateRange: {
                start: currentWeekStart.toISOString(),
                end: currentWeekEnd.toISOString()
            },
            summary: generateTradeSummary(filteredTrades)
        };
    },
}) 