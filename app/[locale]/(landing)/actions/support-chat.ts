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
        response: z.string().describe("The AI's response to help refine the user's question"),
        needsHumanHelp: z.boolean().describe("Whether the question is well-formulated and ready for human assistance"),
        readyForEmail: z.boolean().describe("Whether all necessary information has been gathered for a support email"),
      }),
      prompt:
        `You are an AI assistant for Deltalytix, a trading journaling platform. ` +
        `Your primary role is to help pinpoint and clarify the user's problem so that you can provide ` +
        `comprehensive information to our human support team. ` +
        `You are NOT here to solve technical issues directly, but rather to gather all the necessary details ` +
        `that will help our support team understand and resolve the user's issue quickly and effectively. ` +
        `IMPORTANT: Always start your first response by clearly explaining your role to the user. ` +
        `Let them know you are an AI assistant whose job is to gather information about their problem ` +
        `so you can pass it along to our human support team for resolution. ` +
        `Ask clarifying questions to gather: the specific feature/area they're having trouble with, ` +
        `what they expected to happen, what actually happened, any error messages, steps to reproduce the issue, ` +
        `their account details (if relevant), and any other context that would help our support team. ` +
        `Only set needsHumanHelp to true when you have successfully pinpointed the user's problem and ` +
        `gathered all necessary details for our support team to take over. ` +
        `Set readyForEmail to true only when the conversation contains complete, actionable information ` +
        `that can be forwarded to our support team for resolution. ` +
        `Here's the conversation history:\n\n` +
        messages.map(m => `${m.role}: ${m.content}`).join('\n') +
        `\n\nHelp pinpoint the user's problem by asking targeted questions to gather all necessary details for our support team.`,
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