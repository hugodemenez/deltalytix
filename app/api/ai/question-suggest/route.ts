import { streamText, stepCountIs, convertToModelMessages } from "ai";
import { NextRequest } from "next/server";
import { z } from 'zod/v3';
import { openai } from "@ai-sdk/openai";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
      const { messages } = await req.json();

    const convertedMessages = convertToModelMessages(messages);
    const result = streamText({
      model: openai("gpt-4o"),
      messages: convertedMessages,
      system: `You are a helpful assistant that suggests questions to ask the user based on the context.`,
    });
    return result.toUIMessageStreamResponse();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify({ error: error.errors }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    console.error("Error in chat route:", error);
    return new Response(JSON.stringify({ error: "Failed to process chat" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
} 