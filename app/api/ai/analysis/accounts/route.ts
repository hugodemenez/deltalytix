import { convertToModelMessages, streamText, UIMessage, stepCountIs } from "ai";
import { NextRequest } from "next/server";
import { z } from "zod/v3";

// Analysis Tools
import { generateAnalysisComponent } from "./generate-analysis-component";
import { getAccountPerformance } from "./get-account-performance";

export const maxDuration = 300;

const analysisSchema = z.object({
  username: z.string().optional(),
  locale: z.string().default("en"),
  timezone: z.string().default("UTC"),
  currentTime: z.string().default(new Date().toISOString()),
});

// Remove the schema as we're using streamText with tools instead

function getLanguageInstructions(locale: string) {
  if (locale === "fr") {
    return `- You MUST respond in French (français)
- All content must be in French except for the specific trading terms listed below
- Use French grammar, vocabulary, and sentence structure throughout your response`;
  }
  return `- You MUST respond in ${locale} language`;
}

function getAccountAnalysisPrompt(
  locale: string,
  username?: string,
  timezone?: string,
  currentTime?: string,
) {
  return `# ROLE & PERSONA
You are an expert trading analyst with deep knowledge of quantitative analysis, risk management, and trading psychology. You provide detailed, actionable insights based on trading data.

## CONTEXT & TIMING
${username ? `- Trader: ${username}` : "- Anonymous Trader"}
- Current Time (${timezone || "UTC"}): ${currentTime}
- User Timezone: ${timezone || "UTC"}

## COMMUNICATION LANGUAGE
${getLanguageInstructions(locale)}
- ALWAYS use English trading jargon even when responding in other languages
- Keep these terms in English: Short, Long, Call, Put, Bull, Bear, Stop Loss, Take Profit, Entry, Exit, Bullish, Bearish, Scalping, Swing Trading, Day Trading, Position, Leverage, Margin, Pip, Spread, Breakout, Support, Resistance

## ACCOUNT TRADING ANALYSIS

You are analyzing performance across different trading accounts. Your primary task is to:

1. **Get Account Data**: First, call getAccountPerformance to get comprehensive account statistics and comparisons
2. **Generate Analysis Components**: Then, call generateAnalysisComponent with the account data to create structured analysis components
3. **Provide Insights**: Based on the generated components and data, provide detailed analysis and recommendations

### ANALYSIS PROCESS
1. First, call getAccountPerformance to get account performance data
2. Then, call generateAnalysisComponent with analysisType: 'accounts' and pass the account data
3. Provide detailed insights and recommendations based on the generated components

### FOCUS AREAS
- **Account Comparison**: Performance ranking and metrics comparison
- **Risk Distribution**: How risk is managed across different accounts
- **Trading Patterns**: Different strategies or behaviors per account
- **Capital Allocation**: Effectiveness of capital distribution
- **Account Management**: Overall portfolio management effectiveness

### RESPONSE FORMAT
- Start by calling getAccountPerformance to get the data
- Then call generateAnalysisComponent with the account data
- Use the generated components as a foundation for your analysis
- Provide detailed insights and actionable recommendations
- Reference specific metrics and data points from the tool responses`;
}

export async function POST(req: NextRequest) {
  try {
    const {
      messages,
      username,
      locale,
      timezone,
      currentTime,
    }: {
      messages: UIMessage[];
      username: string;
      currentTime: string;
      locale: string;
      timezone: string;
    } = await req.json();

    // Add debugging to see what locale is being received
    console.log("Account Analysis API received:", {
      username,
      locale,
      timezone,
      currentTime,
    });

    // Validate the request
    const validatedData = analysisSchema.parse({
      username,
      locale,
      timezone,
      currentTime,
    });
    console.log("Validated data:", validatedData);
    const modelMessages = await convertToModelMessages(messages);

    const result = streamText({
      model: "openai/gpt-4o-mini",
      system: getAccountAnalysisPrompt(
        validatedData.locale,
        validatedData.username,
        validatedData.timezone,
        validatedData.currentTime,
      ),
      tools: {
        getAccountPerformance,
        generateAnalysisComponent,
      },
      messages: modelMessages,
      stopWhen: stepCountIs(10),
      onStepFinish: (step) => {
        console.log("Step finished:", step.usage);
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify({ error: error.errors }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    console.error("Error in account analysis route:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process account analysis" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
