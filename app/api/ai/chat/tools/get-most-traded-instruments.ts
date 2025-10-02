import { getTradesAction } from "@/server/database";
import { tool } from "ai";
import { z } from 'zod/v3';


export const getMostTradedInstruments = tool({
    description: 'Get the most traded instruments',
    inputSchema: z.object({}),
    execute: async () => {
        let trades = await getTradesAction();
        let instruments = trades.map(trade => trade.instrument);
        let instrumentCount = instruments.reduce((acc, instrument) => {
            acc[instrument] = (acc[instrument] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        return Object.entries(instrumentCount).sort((a, b) => b[1] - a[1]).map(([instrument, count]) => ({ instrument, count }));
    }
})