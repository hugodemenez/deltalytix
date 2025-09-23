import { parsePositionTime } from "@/lib/utils";
import { getTradesAction } from "@/server/database";
import { tool } from "ai";
import { z } from 'zod/v3';



export const getLastTradesData = tool({
    description: `
        Get last trades from user on a given timeframe.
        This can be useful to understand which instrument he is currently trading or trading time,
        make sure to provide an accountNumber because trades are grouped by accountNumber
        `,
    inputSchema: z.object({
        number: z.number().describe('Number of trades to retrieve'),
        startDate: z.string().describe('Date string in format 2025-01-14T14:33:01.000Z').optional(),
        endDate: z.string().describe('Date string in format 2025-01-14T14:33:01.000Z').optional(),
        accountNumber: z.string().describe('Account number, default to most traded account'),
    }),
    execute: async ({ number, startDate, endDate, accountNumber }) => {
        console.log(`Getting last ${number} trade(s)`)
        let trades = await getTradesAction();
        if (accountNumber) {
            trades = trades.filter(trade => trade.accountNumber === accountNumber);
        }
        if (startDate) {
            trades = trades.filter(trade => trade.entryDate >= startDate);
        }
        if (endDate) {
            trades = trades.filter(trade => trade.entryDate <= endDate);
        }
        trades = trades.sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime());
        trades = trades.slice(0, number);
        return trades.map(trade => ({
            ...trade,
            timeInPosition: parsePositionTime(trade.timeInPosition)
        }));
    }
})
