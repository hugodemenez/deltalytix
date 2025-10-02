import { streamText } from "ai";
import { NextRequest } from "next/server";
import { z } from 'zod/v3';
import { openai } from "@ai-sdk/openai";

// Analysis Tools
import { generateAnalysisComponent } from "../accounts/generate-analysis-component";
import { getInstrumentPerformance } from "../../chat/tools/get-instrument-performance";
import { getMostTradedInstruments } from "../../chat/tools/get-most-traded-instruments";
import { getCurrentWeekSummary } from "../../chat/tools/get-current-week-summary";
import { getPreviousWeekSummary } from "../../chat/tools/get-previous-week-summary";
import { getTradesSummary } from "../../chat/tools/get-trades-summary";

export const maxDuration = 30;

const analysisSchema = z.object({
  username: z.string().optional(),
  locale: z.string().default('en'),
  timezone: z.string().default('UTC'),
});

// Remove the schema as we're using streamText with tools instead

function getLanguageInstructions(locale: string) {
  if (locale === 'fr') {
    return `- You MUST respond in French (français)
- All content must be in French except for the specific trading terms listed below
- Use French grammar, vocabulary, and sentence structure throughout your response`;
  }
  return `- You MUST respond in ${locale} language`;
}

function getInstrumentAnalysisPrompt(locale: string) {
  return `# ROLE & PERSONA
You are an expert trading analyst with deep knowledge of quantitative analysis, risk management, and trading psychology. You provide detailed, actionable insights based on trading data.

## COMMUNICATION LANGUAGE
${getLanguageInstructions(locale)}
- ALWAYS use English trading jargon even when responding in other languages
- Keep these terms in English: Short, Long, Call, Put, Bull, Bear, Stop Loss, Take Profit, Entry, Exit, Bullish, Bearish, Scalping, Swing Trading, Day Trading, Position, Leverage, Margin, Pip, Spread, Breakout, Support, Resistance

## INSTRUMENT TRADING ANALYSIS

You are analyzing performance across different trading instruments. Your primary task is to:

1. **Generate Analysis Components**: Use the generateAnalysisComponent tool to create structured analysis components for instrument performance
2. **Gather Supporting Data**: Use the available data tools to get comprehensive instrument statistics and comparisons
3. **Provide Insights**: Based on the generated components and data, provide detailed analysis and recommendations

### ANALYSIS PROCESS
1. First, call generateAnalysisComponent with analysisType: 'instruments' to get the structured analysis framework
2. Use getInstrumentPerformance to get detailed metrics per instrument
3. Use getMostTradedInstruments for volume and frequency analysis
4. Use other data tools as needed to support your analysis
5. Provide detailed insights and recommendations based on all the gathered data

### FOCUS AREAS
- **Instrument Performance**: Best and worst performing instruments with specific metrics
- **Trading Volume**: Most and least traded instruments and their profitability
- **Risk Analysis**: Volatility and drawdown patterns by instrument
- **Specialization Opportunities**: Instruments showing consistent performance
- **Diversification Assessment**: Portfolio allocation effectiveness across instruments

### RESPONSE FORMAT
- Start by calling generateAnalysisComponent to get the structured analysis
- Use the generated components as a foundation for your analysis
- Supplement with data from other tools
- Provide detailed insights and actionable recommendations
- Reference specific metrics and data points from the tool responses`;
}

export async function POST(req: NextRequest) {
  try {
    const { username, locale, timezone } = await req.json();
    
    // Add debugging to see what locale is being received
    console.log('Instrument Analysis API received:', { username, locale, timezone });
    
    // Validate the request
    const validatedData = analysisSchema.parse({ username, locale, timezone });
    console.log('Validated data:', validatedData);

    const result = streamText({
      model: openai("gpt-4o-mini"),
      system: getInstrumentAnalysisPrompt(validatedData.locale),
      tools: {
        generateAnalysisComponent,
        getInstrumentPerformance,
        getMostTradedInstruments,
        getTradesSummary,
        getCurrentWeekSummary,
        getPreviousWeekSummary
      },
      messages: [
        {
          role: "user",
          content: `Analyze my instrument trading performance and provide detailed insights in ${validatedData.locale} language. Use the generateAnalysisComponent tool to create structured analysis components.`
        }
      ]
    });

    return result.toTextStreamResponse();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify({ error: error.errors }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    console.error("Error in instrument analysis route:", error);
    return new Response(JSON.stringify({ error: "Failed to process instrument analysis" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
