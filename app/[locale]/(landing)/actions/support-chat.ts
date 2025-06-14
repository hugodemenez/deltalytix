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
        `You are a question refinement assistant for Deltalytix, a trading journaling platform. ` +
        `Your role is NOT to answer questions directly, but to help users clearly formulate their support requests. ` +
        `Guide users to provide specific details about their issue by asking clarifying questions. ` +
        `Focus on gathering: the specific feature/area they're having trouble with, what they expected to happen, ` +
        `what actually happened, any error messages, and steps to reproduce the issue. ` +
        `Only set needsHumanHelp to true when the user has provided a clear, detailed, and well-formulated question ` +
        `that includes all necessary context for human support to address effectively. ` +
        `Set readyForEmail to true only when the conversation contains all the information needed for a support email. ` +
        `Here's the conversation history:\n\n` +
        messages.map(m => `${m.role}: ${m.content}`).join('\n') +
        `\n\nHelp the user refine their question with follow-up questions to gather more specific details.`,
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