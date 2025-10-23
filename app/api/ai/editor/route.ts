import { streamText, convertToModelMessages, stepCountIs } from "ai";
import { NextRequest } from "next/server";
import { z } from "zod/v3";
import { openai } from "@ai-sdk/openai";
import { getCurrentDayData } from "./tools/get-current-day-data";
import { ActionSchema } from "./schema";
import { getDayData } from "./tools/get-trading-summary";

export const maxDuration = 90;

type EditorAction = z.infer<typeof ActionSchema>;

// Model selection based on action type
const getModelForAction = (action: EditorAction) => {
  switch (action) {
    case "explain":
      // Access latest news with up to date data
      return "perplexity/sonar";
    case "improve":
      // Fast, cost-effective model for simple edits
      return openai("gpt-4o-mini");
    case "suggest_question":
      // More capable model for question generation
      return openai("gpt-4o");
    case "trades_summary":
      // More capable model for summarizing trades
      return openai("gpt-4o-mini");
    default:
      return openai("gpt-4o-mini");
  }
};

// System prompts based on action type
const getSystemPrompt = (
  action: EditorAction,
  locale: string,
  date: string,
) => {
  const baseContext = `You are an expert trading journal assistant embedded inside a rich text editor.

CONTEXT: The user is writing in their trading journal focusing on futures trading. They may be reflecting on their trades, emotions, market conditions, or overall performance.
RULE: Respond in ${locale} language or follow the user's conversation language.

Return ONLY the response with no preface, no markdown fences, no notes, and no explanations.
Keep formatting simple and suitable for insertion into a paragraph.`;

  switch (action) {
    case "explain":
      return `${baseContext}

TASK: Explain the provided text in simple, clear terms.
- Search latest news if user wants an explanation about an event or market condition / concept
- Use 2-4 concise sentences
- Clarify what's already written without adding new claims
- Make it understandable for traders at any level
- Focus on the trading context and implications`;

    case "improve":
      return `${baseContext}

TASK: Identify concrete improvements to the provided text.
- Return a short bulleted list (3-5 items)
- Each bullet should start with an action verb
- Keep each point to one line maximum
- Focus on trading-specific improvements (clarity, actionability, specificity)
- Prioritize improvements that help the trader learn from their experience`;

    case "suggest_question":
      return `${baseContext}

TASK: Generate insightful questions that help the trader reflect deeper on their journal entry.
- Always based your question based on current day trading data
- Create a single thought-provoking questions
- Question should encourage self-reflection and learning
- Focus on: decision-making process, emotional state, risk management, market analysis
- Question should be specific to the content provided
- Make questions actionable and relevant to improving trading performance`;

    case "trades_summary":
      return `${baseContext}

TASK: ONLY BASED ON TOOL RESULT for date ${date}: Summarize the trader's trading activities for the current day.
- Include key metrics such as profit/loss, win/loss ratio, average trade size
`;

    default:
      return baseContext;
  }
};

const getTools = (action: EditorAction) => {
  switch (action) {
    case "suggest_question":
      return { getCurrentDayData };
    case "trades_summary":
      return { getDayData };
  }
};

export async function POST(req: NextRequest) {
  console.log("POST request received");
  try {
    const body = await req.json();
    const { prompt, locale = "en", action = "explain", date } = body;

    // Validate action
    const validatedAction = ActionSchema.parse(action);

    // Select model and system prompt based on action
    const model = getModelForAction(validatedAction);
    const systemPrompt = getSystemPrompt(validatedAction, locale, date);
    // Dynamically build tools based on criteria
    const tools: Record<string, any> = {};
    
    if (validatedAction === "suggest_question") {
      tools.getCurrentDayData = getCurrentDayData;
    }
    if (validatedAction === "trades_summary") {
      tools.getDayData = getDayData;
    }

    // Stream the response
    const result = streamText({
      model,
      prompt,
      system: systemPrompt,
      temperature: validatedAction === "suggest_question" ? 0.7 : 0.3,
      tools,
      stopWhen: stepCountIs(5),
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      console.error("Validation error in editor AI route:", error.errors);
      return new Response(
        JSON.stringify({
          error: "Invalid request parameters",
          details: error.errors,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Handle rate limit errors
    if (
      (error as any)?.statusCode === 429 ||
      (error as any)?.type === "rate_limit_exceeded"
    ) {
      return new Response(
        JSON.stringify({
          error: "Rate limit exceeded",
          message:
            "AI service is temporarily busy. Please try again in a moment.",
          type: "rate_limit_exceeded",
          retryAfter: 60,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": "60",
          },
        },
      );
    }

    // Handle service unavailability
    if ((error as any)?.statusCode >= 400 && (error as any)?.statusCode < 500) {
      return new Response(
        JSON.stringify({
          error: "Service temporarily unavailable",
          message:
            "AI service is temporarily unavailable. Please try again later.",
          type: "service_unavailable",
        }),
        {
          status: 503,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    }

    // Handle generic errors
    console.error("Error in editor AI route:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to process AI request",
        message: "An unexpected error occurred. Please try again.",
        type: "internal_error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
