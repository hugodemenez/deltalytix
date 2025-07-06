import { streamText } from "ai";
import { NextRequest } from "next/server";
import { z } from "zod";
import { openai } from "@ai-sdk/openai";

// Global Analysis Tools
import { getOverallPerformanceMetrics } from "../chat/tools/get-overall-performance-metrics";
import { getPerformanceTrends } from "../chat/tools/get-performance-trends";

// Instrument Analysis Tools
import { getInstrumentPerformance } from "../chat/tools/get-instrument-performance";
import { getMostTradedInstruments } from "../chat/tools/get-most-traded-instruments";

// Account Analysis Tools
import { getAccountPerformance } from "../chat/tools/get-account-performance";

// Time of Day Analysis Tools
import { getTimeOfDayPerformance } from "../chat/tools/get-time-of-day-performance";

// Fallback tools
import { getCurrentWeekSummary } from "../chat/tools/get-current-week-summary";
import { getPreviousWeekSummary } from "../chat/tools/get-previous-week-summary";
import { getTradesSummary } from "../chat/tools/get-trades-summary";

export const maxDuration = 30;

const analysisSchema = z.object({
  section: z.enum(['global', 'instrument', 'accounts', 'timeOfDay']),
  username: z.string().optional(),
  locale: z.string().default('en'),
  timezone: z.string().default('UTC'),
});

function getToolsForSection(section: string) {
  const baseTools = {
    getTradesSummary,
    getCurrentWeekSummary,
    getPreviousWeekSummary,
    getMostTradedInstruments
  };

  switch (section) {
    case 'global':
      return {
        ...baseTools,
        getOverallPerformanceMetrics,
        getPerformanceTrends
      };
    case 'instrument':
      return {
        ...baseTools,
        getInstrumentPerformance
      };
    case 'accounts':
      return {
        ...baseTools,
        getAccountPerformance
      };
    case 'timeOfDay':
      return {
        ...baseTools,
        getTimeOfDayPerformance
      };
    default:
      return baseTools;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { section, username, locale, timezone } = await req.json();
    
    // Add debugging to see what locale is being received
    console.log('Analysis API received:', { section, username, locale, timezone });
    
    // Validate the request
    const validatedData = analysisSchema.parse({ section, username, locale, timezone });
    console.log('Validated data:', validatedData);

    const result = streamText({
      model: openai("gpt-4o-mini"),
      
      system: `# ROLE & PERSONA
You are an expert trading analyst with deep knowledge of quantitative analysis, risk management, and trading psychology. You provide detailed, actionable insights based on trading data.

## COMMUNICATION LANGUAGE
${validatedData.locale === 'fr' ? 
  `- You MUST respond in French (français)
- All content must be in French except for the specific trading terms listed below
- Use French grammar, vocabulary, and sentence structure throughout your response` :
  `- You MUST respond in ${validatedData.locale} language`
}
- ALWAYS use English trading jargon even when responding in other languages
- Keep these terms in English: Short, Long, Call, Put, Bull, Bear, Stop Loss, Take Profit, Entry, Exit, Bullish, Bearish, Scalping, Swing Trading, Day Trading, Position, Leverage, Margin, Pip, Spread, Breakout, Support, Resistance

## ANALYSIS SECTION: ${validatedData.section.toUpperCase()}

You are analyzing the ${validatedData.section} section of trading performance. Provide detailed insights in the following JSON format:

{
  "title": "Section Title${validatedData.locale === 'fr' ? ' (in French)' : ''}",
  "description": "Brief description of what this analysis covers${validatedData.locale === 'fr' ? ' (in French)' : ''}",
  "insights": [
    {
      "type": "positive|negative|neutral",
      "message": "Detailed insight message${validatedData.locale === 'fr' ? ' (in French)' : ''}",
      "metric": "Optional metric value"
    }
  ],
  "score": 85,
  "trend": "up|down|neutral",
  "recommendations": [
    "Specific actionable recommendation 1${validatedData.locale === 'fr' ? ' (in French)' : ''}",
    "Specific actionable recommendation 2${validatedData.locale === 'fr' ? ' (in French)' : ''}",
    "Specific actionable recommendation 3${validatedData.locale === 'fr' ? ' (in French)' : ''}"
  ]
}

## ANALYSIS REQUIREMENTS

GLOBAL ANALYSIS:
- Use getOverallPerformanceMetrics to get comprehensive statistics
- Use getPerformanceTrends to identify patterns over time
- Focus on overall performance metrics and trends
- Win rate analysis and improvements
- Risk management assessment
- Trading consistency evaluation
- Psychological factors and behavioral patterns

INSTRUMENT ANALYSIS:
- Use getInstrumentPerformance to get detailed metrics per instrument
- Use getMostTradedInstruments for volume analysis
- Performance by trading instruments
- Best and worst performing instruments
- Allocation recommendations
- Instrument-specific patterns and risk analysis

ACCOUNT ANALYSIS:
- Use getAccountPerformance to compare across accounts
- Performance across different accounts
- Account management effectiveness
- Risk distribution analysis
- Account consolidation opportunities
- Portfolio optimization recommendations

TIME OF DAY ANALYSIS:
- Use getTimeOfDayPerformance for comprehensive time-based analysis
- Performance by time periods (hourly, daily, sessions)
- Optimal trading windows
- Session-specific patterns
- Time-based recommendations

## DATA PRESENTATION
- Use specific metrics and percentages from the tools
- Provide actionable recommendations based on the data
- Include both positive and negative insights
- Score should be 0-100 based on performance analysis
- Trend should reflect recent performance direction
- Reference actual data points from the tool responses

## RESPONSE FORMAT
Return ONLY valid JSON in the specified format. No additional text or explanations.`,
      
      toolCallStreaming: true,
      messages: [
        {
          role: "user",
          content: `Analyze my ${validatedData.section} trading performance and provide detailed insights in ${validatedData.locale} language.`
        }
      ],
      maxSteps: 5,
      tools: getToolsForSection(validatedData.section),
    });

    return result.toDataStreamResponse();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify({ error: error.errors }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    console.error("Error in analysis route:", error);
    return new Response(JSON.stringify({ error: "Failed to process analysis" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}