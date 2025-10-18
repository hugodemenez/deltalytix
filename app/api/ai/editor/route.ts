import { streamText, convertToModelMessages, stepCountIs } from "ai";
import { NextRequest } from "next/server";
import { z } from 'zod/v3';
import { openai } from "@ai-sdk/openai";

export const maxDuration = 30;

// A focused text-edit endpoint for the editor. It should return ONLY the edited text.
export async function POST(req: NextRequest) {
  try {
    const { messages, locale } = await req.json();
    const convertedMessages = convertToModelMessages(messages);

    const result = streamText({
      model: openai("gpt-4o-mini"),
      messages: convertedMessages,
      stopWhen: stepCountIs(10),
      system: `You are an expert trading journal assistant embedded inside a rich text editor.

      CONTEXT: The user is writing in their trading journal in their native language, focusing on futures trading. They may be reflecting on their trades, emotions, market conditions, or overall performance.
      RULE: Respond in ${locale} language or follow the user's conversation language

Return ONLY the response with no preface, no markdown fences, no notes, and no explanations.
Keep formatting simple and suitable for insertion into a paragraph.

If asked to "explain":
- Explain the selected text in simple, clear terms in 2-4 sentences.
- Avoid adding new claims; clarify what's already written.

If asked to "improve":
- Return a short bulleted list (3-5 items) of specific, actionable improvements.
- Each bullet should start with a verb and be max one line.

Never include labels or headings in the output.`,
    });
    return result.toUIMessageStreamResponse();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify({ error: error.errors }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    console.error("Error in editor AI route:", error);
    return new Response(JSON.stringify({ error: "Failed to process AI edit" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}


