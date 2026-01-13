import { openai } from "@ai-sdk/openai";
import { generateText, Output } from "ai";
import { NextRequest } from "next/server";
import { z } from 'zod/v3';

export const maxDuration = 30;

const dateRangeSchema = z.object({
  from: z.string().nullable().describe("Start date in ISO 8601 format (YYYY-MM-DD), or null if this is a weekday filter"),
  to: z.string().nullable().describe("End date in ISO 8601 format (YYYY-MM-DD), or null if this is a weekday filter"),
  weekdays: z.array(z.number()).nullable().optional().describe("Array of days of week (0=Sunday, 1=Monday, ..., 6=Saturday), or null if this is a date range filter. Can contain multiple days for queries like 'mondays and fridays'"),
});

const requestSchema = z.object({
  query: z.string().describe("Natural language date query"),
  locale: z.string().optional().default("en").describe("User locale (e.g., 'en', 'fr')"),
  timezone: z.string().optional().describe("User timezone (e.g., 'America/New_York', 'Europe/Paris')"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, locale = "en", timezone } = requestSchema.parse(body);

    if (!query.trim()) {
      return new Response(JSON.stringify({ error: "Query is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get current date context
    const now = new Date();
    const currentDateISO = now.toISOString().split('T')[0];
    const currentDateFormatted = now.toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: timezone || 'UTC'
    });

    const { output } = await generateText({
      model: 'openai/gpt-5-mini',
      output: Output.object({ schema: dateRangeSchema }),
      prompt: `You are an expert at parsing natural language date queries into date ranges or weekday filters.

CONTEXT:
- Current Date: ${currentDateISO} (${currentDateFormatted})
- User Locale: ${locale}
- User Timezone: ${timezone || 'UTC'}

TASK:
Parse the following natural language date query and return either:
1. A date range with 'from' and 'to' dates (set weekdays to null)
2. A weekday filter (set weekdays to an array of 0-6 values, and set from/to to null)

RULES FOR DATE RANGES:
1. For single dates (e.g., "today", "yesterday", "January 15", "2024-01-15"), set both 'from' and 'to' to the same date, weekdays to null
2. For date ranges (e.g., "last week", "this month", "January 1 to January 15"), return the appropriate range, weekdays to null
3. Always use ISO 8601 format (YYYY-MM-DD) for dates
4. Consider the user's timezone when calculating relative dates like "today", "yesterday", "this week"
5. For relative periods:
   - "today" = current date
   - "yesterday" = previous day
   - "this week" = start of current week (Monday) to end of current week (Sunday)
   - "last week" = previous week (Monday to Sunday)
   - "this month" = first day of current month to last day of current month
   - "last month" = first day of previous month to last day of previous month
   - "last 3 months" = 3 months ago from today to today
   - "last 6 months" = 6 months ago from today to today
   - "this year" = January 1 to December 31 of current year
   - "last year" = January 1 to December 31 of previous year
6. For ambiguous queries, use reasonable defaults (e.g., "last week" = previous complete week)

RULES FOR WEEKDAY FILTERS:
- If the query asks for specific days of the week, return an array of weekday numbers:
  - Sunday = 0, Monday = 1, Tuesday = 2, Wednesday = 3, Thursday = 4, Friday = 5, Saturday = 6
- Set 'from' and 'to' to null when returning a weekday filter
- For single day queries (e.g., "all mondays", "mondays", "every monday"), return an array with one element: [1]
- For multiple day queries (e.g., "mondays and fridays", "tuesday and thursday", "lundi et vendredi"), return an array with multiple elements: [1, 5]
- Common patterns: 
  - Single: "all mondays", "mondays", "every monday", "all monday", "monday trades", "tuesday", "fridays"
  - Multiple: "mondays and fridays", "monday and friday", "tuesday and thursday", "weekdays" (Mon-Fri = [1,2,3,4,5])
- Support both English and French day names (lundi=monday=1, mardi=tuesday=2, etc.)
- For "weekdays" or "week days", return [1,2,3,4,5] (Monday-Friday)
- For "weekend" or "weekends", return [0,6] (Sunday-Saturday)

EXAMPLES:
- "today" → { from: "${currentDateISO}", to: "${currentDateISO}", weekdays: null }
- "yesterday" → { from: "2024-01-14", to: "2024-01-14", weekdays: null }
- "last week" → { from: "2024-01-08", to: "2024-01-14", weekdays: null }
- "all mondays" → { from: null, to: null, weekdays: [1] }
- "mondays" → { from: null, to: null, weekdays: [1] }
- "every friday" → { from: null, to: null, weekdays: [5] }
- "mondays and fridays" → { from: null, to: null, weekdays: [1, 5] }
- "monday and friday" → { from: null, to: null, weekdays: [1, 5] }
- "tuesday and thursday" → { from: null, to: null, weekdays: [2, 4] }
- "weekdays" → { from: null, to: null, weekdays: [1, 2, 3, 4, 5] }
- "weekend" → { from: null, to: null, weekdays: [0, 6] }
- "tous les lundis" (French) → { from: null, to: null, weekdays: [1] }
- "lundi et vendredi" (French) → { from: null, to: null, weekdays: [1, 5] }

QUERY TO PARSE: "${query}"

Return the appropriate filter type (date range OR weekday).`,
      temperature: 0.1,
    });

    return new Response(JSON.stringify(output), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify({ error: error.errors }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    console.error("Error in date parsing route:", error);
    return new Response(JSON.stringify({ error: "Failed to parse date query" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
