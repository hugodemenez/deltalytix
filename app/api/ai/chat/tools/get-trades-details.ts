import { getTradesAction } from "@/server/database";
import { tool } from "ai";
import { z } from 'zod/v3';


export const getTradesDetails = tool({
    description: 'Only use this tool if the user asks for trade details. Get trade details for a maximum of 10 trades with specific filters',
    inputSchema: z.object({
        instrument: z.string().describe('Instrument').optional(),
        startDate: z.string().describe('Date string in format 2025-01-14T14:33:01.000Z').optional(),
        endDate: z.string().describe('Date string in format 2025-01-14T14:33:01.000Z').optional(),
        accountNumber: z.string().describe('Account number').optional(),
        side: z.string().describe('Side').optional(),
    }),
    execute: async ({ instrument, startDate, endDate, accountNumber, side }: { instrument?: string, startDate?: string, endDate?: string, accountNumber?: string, side?: string }) => {
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
            images: [trade.imageBase64, trade.imageBase64Second],
        }));
    }
})