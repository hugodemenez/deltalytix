import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { NextRequest } from "next/server";
import { z } from 'zod/v3';

export const maxDuration = 30;

const dateRangeSchema = z.object({
  from: z.string().describe("Start date in ISO 8601 format (YYYY-MM-DD)"),
  to: z.string().describe("End date in ISO 8601 format (YYYY-MM-DD)"),
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

    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: dateRangeSchema,
      prompt: `You are an expert at parsing natural language date queries into date ranges.

CONTEXT:
- Current Date: ${currentDateISO} (${currentDateFormatted})
- User Locale: ${locale}
- User Timezone: ${timezone || 'UTC'}

TASK:
Parse the following natural language date query and return a date range with 'from' and 'to' dates in ISO 8601 format (YYYY-MM-DD).

RULES:
1. For single dates (e.g., "today", "yesterday", "January 15", "2024-01-15"), set both 'from' and 'to' to the same date
2. For date ranges (e.g., "last week", "this month", "January 1 to January 15"), return the appropriate range
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
7. If the query doesn't contain a date reference, return null values or an error

EXAMPLES:
- "today" → { from: "${currentDateISO}", to: "${currentDateISO}" }
- "yesterday" → { from: "2024-01-14", to: "2024-01-14" } (assuming today is 2024-01-15)
- "last week" → { from: "2024-01-08", to: "2024-01-14" } (previous Monday to Sunday)
- "this month" → { from: "2024-01-01", to: "2024-01-31" } (first to last day of current month)
- "January 15" → { from: "2024-01-15", to: "2024-01-15" }
- "January 1 to January 15" → { from: "2024-01-01", to: "2024-01-15" }
- "last 3 months" → { from: "2023-10-15", to: "${currentDateISO}" } (3 months ago to today)

QUERY TO PARSE: "${query}"

Return the date range in ISO 8601 format.`,
      temperature: 0.1,
    });

    return new Response(JSON.stringify(object), {
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

