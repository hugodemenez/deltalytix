import { getMoodHistory } from '@/server/journal';
import { Mood } from '@/prisma/generated/prisma/client';
import { tool } from 'ai';
import { z } from 'zod/v3';

export const getJournalEntries = tool({
  description: 'Get journal entries from a given date. This can be useful to understand the user\'s mood and trading patterns',
  inputSchema: z.object({
    fromDate: z.string().describe('Date in format 2025-01-14'),
    toDate: z.string().describe('Date in format 2025-01-14').optional(),
  }),
  execute: async ({ fromDate, toDate }: { fromDate: string, toDate?: string }) => {
    const journalEntries = await getMoodHistory(new Date(fromDate), toDate ? new Date(toDate) : undefined);
    return journalEntries.map(entry => ({
      day: entry.day,
      mood: entry.mood,
      journalContent: entry.journalContent,
    })) as Partial<Mood>[];
  }
})