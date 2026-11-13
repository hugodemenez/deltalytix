import {
  clampFinancialEventWindowToCap,
  explicitFinancialEventWindow,
  FinancialEventWindowTooWideError,
} from '@/lib/financial-events/date-window';
import { loadFinancialEvents } from '@/lib/financial-events/load';
import { tool, type Tool } from 'ai';
import { z } from 'zod/v3';

const WIDE_RANGE_NOTICE =
  'The requested range is wider than 62 days. Only the 62 days ending at the requested end were loaded.';

export const getFinancialNews = tool({
  description: 'Get the news for a given date range',
  inputSchema: z.object({
    locale: z.string().describe('User locale from the conversation'),
    startDate: z.string().describe('Date string in format 2025-01-14T14:33:01.000Z'),
    endDate: z.string().describe('Date string in format 2025-01-14T14:33:01.000Z')
  }),
  execute: async ({ locale, startDate, endDate }: { locale: string, startDate: string, endDate: string }) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const requested = explicitFinancialEventWindow(start, end);
    if (!requested) return [];
    const { window, clamped } = clampFinancialEventWindowToCap(requested);
    try {
      const events = await loadFinancialEvents(locale, window, 'desc');
      const filtered = events.filter(event => {
        const eventDate = new Date(event.date);
        return eventDate >= window.start && eventDate <= window.end;
      });
      if (!clamped) return filtered;
      return {
        notice: `${WIDE_RANGE_NOTICE} Applied ${window.start.toISOString()} through ${window.end.toISOString()}.`,
        appliedStart: window.start.toISOString(),
        appliedEnd: window.end.toISOString(),
        events: filtered,
      };
    } catch (error) {
      if (error instanceof FinancialEventWindowTooWideError) {
        return {
          notice: WIDE_RANGE_NOTICE,
          events: [],
        };
      }
      console.error('Error fetching financial events:', error);
      return [];
    }
  },
})
