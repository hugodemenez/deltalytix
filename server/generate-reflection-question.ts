'use server'

import { openai } from "@ai-sdk/openai"
import { streamObject } from "ai"
import { z } from "zod"
import { GenerateReflectionQuestionParams, GenerateFollowUpParams, ReflectionQuestionResponse } from "@/app/types/chat"

export async function generateReflectionQuestion({ 
  dayData, 
  dateString, 
  messages, 
  userInput,
  isInitialGreeting = false,
  userName = 'Trader',
  lastQuestion = ''
}: GenerateReflectionQuestionParams): Promise<ReflectionQuestionResponse> {
  try {
    const { partialObjectStream } = await streamObject({
      model: openai("gpt-3.5-turbo"),
      schema: z.object({
        greeting: z.string().optional().describe("A personalized greeting based on the trading data"),
        response: z.string().describe("A concise response to the user's input"),
        question: z.string().optional().describe("A follow-up question, if appropriate"),
        shouldEnd: z.boolean().describe("Whether the conversation should end"),
      }),
      prompt: isInitialGreeting
        ? `You are an AI assistant specializing in trading psychology and performance analysis. 
           Generate a brief, personalized greeting and initial question based on the following trading data for ${dateString}:
           Trader's name: ${userName}
           Total PnL: $${dayData.pnl.toFixed(2)}
           Number of trades: ${dayData.tradeNumber}
           Long trades: ${dayData.longNumber}
           Short trades: ${dayData.shortNumber}
           Trades: ${dayData.trades.map(t => `${t.instrument} (${t.side}): $${t.pnl}`).join(', ')}
           
           Provide:
           1. A brief, personalized greeting that addresses the trader by name and acknowledges their performance (positive or negative)
           2. A single, focused initial question to start the reflection process
           
           Use appropriate emojis to make the conversation engaging and friendly.`
        : `You are an AI assistant specializing in trading psychology and performance analysis. 
           You're having a concise conversation with a trader about their day. 
           Given the following trading data for ${dateString}:
           Total PnL: $${dayData.pnl.toFixed(2)}
           Number of trades: ${dayData.tradeNumber}
           Long trades: ${dayData.longNumber}
           Short trades: ${dayData.shortNumber}
           Trades: ${dayData.trades.map(t => `${t.instrument} (${t.side}): $${t.pnl}`).join(', ')}
           
           Conversation history:
           ${messages.map(m => `${m.role}: ${m.content}`).join('\n')}
           
           User's latest input: ${userInput}
           
           Last question asked: ${lastQuestion}
           
           Please provide:
           1. A concise response to the user's input. This may include a brief insight or acknowledgment.
           2. A follow-up question, if appropriate. Make it relevant to the user's last input or a new aspect of their trading day.
           3. Whether the conversation should end (true/false)
           
           Guidelines:
           - Keep responses very brief, typically 1-2 sentences.
           - Aim for a focused conversation (3-5 total exchanges).
           - Always try to ask a follow-up question unless the user clearly wants to end the conversation.
           - Make questions thought-provoking but concise.
           - Set shouldEnd to true only if the user explicitly indicates they want to end the conversation.
           - Use emojis sparingly to keep the conversation engaging.
           
           Important: 
           - Be responsive to the user's input. If they provide new information, acknowledge it and ask about it.
           - Avoid lengthy analysis or elaboration.
           - When providing insights, be concise and directly related to the user's input or trading data.
           - Don't repeat previous questions or topics.`,
      temperature: 0.7,
    });

    let greeting = "";
    let response = "";
    let question = "";
    let shouldEnd = false;

    for await (const partialObject of partialObjectStream) {
      if (partialObject.greeting) greeting = partialObject.greeting;
      if (partialObject.response) response = partialObject.response;
      if (partialObject.question) question = partialObject.question;
      if (partialObject.shouldEnd !== undefined) shouldEnd = partialObject.shouldEnd;
    }

    return { greeting, response, question, shouldEnd };
  } catch (error) {
    console.error("Error generating reflection response:", error);
    return {
      response: "I apologize, but I'm having trouble processing your response. Can you briefly tell me about your trading day?",
      question: "What aspect of your trading would you like to discuss?",
      shouldEnd: false
    };
  }
}

export async function generateFollowUp({ dayData, dateString, messages, lastContent }: GenerateFollowUpParams): Promise<{ shouldFollowUp: boolean; feedback: string; question: string }> {

  try {
    const { partialObjectStream } = await streamObject({
      model: openai("gpt-3.5-turbo"),
      schema: z.object({
        shouldFollowUp: z.boolean().describe("Whether a follow-up is necessary"),
        feedback: z.string().optional().describe("A brief feedback or observation, max 2 sentences"),
        question: z.string().optional().describe("A single, focused follow-up question"),
      }),
      prompt:
        `Given the following trading data for ${dateString}:\n` +
        `Total PnL: $${dayData.pnl.toFixed(2)}\n` +
        `Number of trades: ${dayData.tradeNumber}\n` +
        `Long trades: ${dayData.longNumber}\n` +
        `Short trades: ${dayData.shortNumber}\n` +
        `Trades: ${dayData.trades.map(t => `${t.instrument} (${t.side}): $${t.pnl}`).join(', ')}\n\n` +
        `Conversation history:\n${messages.map(m => `${m.role}: ${m.content}`).join('\n')}\n\n` +
        `Last AI message: ${lastContent}\n\n` +
        `Determine if a follow-up is necessary based on the following criteria:\n` +
        `1. The conversation doesn't feel complete or there are unanswered questions.\n` +
        `2. There's an opportunity to dive deeper into an important aspect of the trader's day.\n` +
        `3. The trader's response indicates they need more guidance or clarification.\n` +
        `4. There's a significant insight or pattern that hasn't been addressed yet.\n\n` +
        `Important: Do NOT follow up if:\n` +
        `1. The user's response is short (less than 10 words), enthusiastic, or doesn't provide new information to discuss.\n` +
        `2. The user's response indicates they don't want to elaborate further or want to end the conversation.\n` +
        `3. The conversation has reached a natural conclusion.\n` +
        `4. The user has responded with a variation of "nothing", "cool", "thanks", or any phrase suggesting they want to end the conversation.\n\n` +
        `If a follow-up is needed, provide:\n` +
        `1. A brief feedback or observation (max 2 sentences)\n` +
        `2. A single, focused follow-up question\n` +
        `If no follow-up is needed, set shouldFollowUp to false and leave feedback and question empty.`,
      temperature: 0.7,
    });

    let shouldFollowUp = false;
    let feedback = "";
    let question = "";

    for await (const partialObject of partialObjectStream) {
      if (partialObject.shouldFollowUp !== undefined) shouldFollowUp = partialObject.shouldFollowUp;
      if (partialObject.feedback) feedback = partialObject.feedback;
      if (partialObject.question) question = partialObject.question;
    }

    return { shouldFollowUp, feedback, question };
  } catch (error) {
    console.error("Error generating follow-up:", error);
    return { shouldFollowUp: false, feedback: "", question: "" };
  }
}