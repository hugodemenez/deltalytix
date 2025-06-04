import { getFinancialEvents } from '@/server/financial-events';
import { tool } from 'ai';
import { z } from 'zod';

export const createNewsTool = (locale: string) => tool({
    description: 'Get the news for a given date range',
    parameters: z.object({
      startDate: z.string().describe('Date string in format 2025-01-14T14:33:01.000Z'),
      endDate: z.string().describe('Date string in format 2025-01-14T14:33:01.000Z')
    }),
    execute: async ({ startDate, endDate }: { startDate: string, endDate: string }) => {
      const events = await getFinancialEvents(locale);
      const start = new Date(startDate);
      const end = new Date(endDate);
      const filteredEvents = events.filter(event => {
        const eventDate = new Date(event.date);
        return eventDate >= start && eventDate <= end;
      });
      return filteredEvents;
    },
})