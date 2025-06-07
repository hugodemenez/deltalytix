import { getTradesAction } from "@/server/database";
import { tool } from "ai";
import { z } from "zod";

export const getLastTradesData = tool({
    description: `
        Get X last trades from user.
        This can be useful to understand which instrument he is currently trading or trading time,
        make sure to provide an accountNumber because trades are grouped by accountNumber
        `,
    parameters: z.object({
        number: z.number().describe('Number of trades to retrieve'),
        accountNumber: z.string().describe('Account number').optional(),
    }),
    execute: async ({ number, accountNumber }) => {
        console.log(`Getting last ${number} trade(s)`)
        let trades = await getTradesAction();
        if (accountNumber) {
            trades = trades.filter(trade => trade.accountNumber === accountNumber);
        }
        trades = trades.sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime());
        trades = trades.slice(0, number);
        return trades;
    }
})
