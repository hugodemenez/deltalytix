import { getMoodHistory } from '@/server/journal';
import { Mood } from '@/prisma/generated/prisma/client';
import { tool } from 'ai';
import { z } from 'zod/v3';

export const getPreviousConversation = tool({
  description: 'Get the previous conversation with the user. For a given timeframe, it will return the conversation with the user.',
  inputSchema: z.object({
    fromDate: z.string().describe('Date in format 2025-01-14'),
    toDate: z.string().describe('Date in format 2025-01-14').optional(),
  }),
  execute: async ({ fromDate, toDate }: { fromDate: string, toDate?: string }) => {
    const journalEntries = await getMoodHistory(new Date(fromDate), toDate ? new Date(toDate) : undefined);
    return journalEntries.map(entry => ({
      day: entry.day,
      conversation: entry.conversation,
    })) as Partial<Mood>[];
  }
})