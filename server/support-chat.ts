// app/actions/supportChat.ts
'use server'

import { openai } from "@ai-sdk/openai"
import { streamObject } from "ai"
import { z } from "zod"
import { Message } from 'ai'

export async function supportChat(messages: Message[]): Promise<{ 
  response: string; 
  needsHumanHelp: boolean;
  readyForEmail: boolean;
}> {
  try {
    const { partialObjectStream } = await streamObject({
      model: openai("gpt-4.1-nano-2025-04-14"),
      schema: z.object({
        response: z.string().describe("The AI's response to the user's query"),
        needsHumanHelp: z.boolean().describe("Whether the query requires human assistance"),
        readyForEmail: z.boolean().describe("Whether the conversation has all necessary information for an email"),
      }),
      prompt:
        `You are a support assistant for Deltalytix, a trading journaling platform. ` +
        `Answer the user's questions about the platform. If you can't answer or if the query is complex, ` +
        `set needsHumanHelp to true. If the conversation has gathered all necessary information for a support request, ` +
        `set readyForEmail to true. Here's the conversation history:\n\n` +
        messages.map(m => `${m.role}: ${m.content}`).join('\n') +
        `\n\nPlease provide a response, determine if human help is needed, and if the conversation is ready for an email.`,
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
    console.error("Error in support chat:", error);
    throw error;
  }
}