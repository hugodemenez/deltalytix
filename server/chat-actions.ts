'use server'

import { openai } from "@ai-sdk/openai"
import { streamObject } from "ai"
import { z } from "zod"
import { Message } from 'ai'

export async function chatAI(messages: Message[]): Promise<{ 
  response: string;
  needsHumanHelp: boolean;
  readyForEmail: boolean;
}> {
  try {
    const { partialObjectStream } = await streamObject({
      model: openai("gpt-4o-mini"),
      schema: z.object({
        response: z.string().describe("The AI's response to the user's query"),
        needsHumanHelp: z.boolean().describe("Whether the query requires human assistance"),
        readyForEmail: z.boolean().describe("Whether the conversation has all necessary information for an email"),
      }),
      prompt:
        `You are a helpful and knowledgeable AI assistant. Provide clear, concise, and accurate responses. ` +
        `Set needsHumanHelp to true if:
        - The user's query is complex or technical
        - You're not confident about the answer
        - The user explicitly asks for human help
        - The query involves account-specific issues
        - Multiple back-and-forth exchanges haven't resolved the issue
        
        Set readyForEmail to true if:
        - The conversation has enough context about the user's issue
        - You've gathered specific details about their problem
        - The user has expressed a clear need for human assistance
        
        Here's the conversation history:\n\n` +
        messages.map(m => `${m.role}: ${m.content}`).join('\n') +
        `\n\nPlease provide a response that continues this conversation naturally.`,
      temperature: 0.7,
    });

    let response = "";
    let needsHumanHelp = false;
    let readyForEmail = false;

    for await (const partialObject of partialObjectStream) {
      if (partialObject.response) response = partialObject.response;
      if (partialObject.needsHumanHelp !== undefined) needsHumanHelp = partialObject.needsHumanHelp;
      if (partialObject.readyForEmail !== undefined) readyForEmail = partialObject.readyForEmail;
    }

    return { response, needsHumanHelp, readyForEmail };
  } catch (error) {
    console.error("Error in chat:", error);
    throw error;
  }
} 