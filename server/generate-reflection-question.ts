'use server'

import { openai } from "@ai-sdk/openai"
import { streamObject } from "ai"
import { z } from "zod"
import { GenerateReflectionQuestionParams, GenerateFollowUpParams } from "@/app/types/chat"

const endConversationKeywords = ['end', 'stop', 'finish', 'bye', 'goodbye', 'thanks', 'thank you', 'nothing', "let's end", "that's all"]

export async function generateReflectionQuestion({ dayData, dateString, messages, userInput }: GenerateReflectionQuestionParams): Promise<{ feedback: string; question: string; shouldEnd: boolean }> {
  const lowercaseUserInput = userInput.toLowerCase().trim()
  
  // Check for explicit end conversation requests
  if (endConversationKeywords.some(keyword => lowercaseUserInput.includes(keyword)) ||
      lowercaseUserInput === "stop" ||
      lowercaseUserInput === "end" ||
      lowercaseUserInput === "stop the conversation" ||
      lowercaseUserInput === "end the conversation") {
    return {
      feedback: "I understand you'd like to end our conversation. Thank you for reflecting on your trading day. If you have any more questions in the future, feel free to ask.",
      question: "",
      shouldEnd: true
    }
  }

  try {
    const { partialObjectStream } = await streamObject({
      model: openai("gpt-4o-mini"),
      schema: z.object({
        feedback: z.string().describe("A brief feedback on the user's response, max 2 sentences"),
        question: z.string().describe("A single, focused follow-up question"),
        shouldEnd: z.boolean().describe("Whether the conversation should end"),
      }),
      prompt:
        `You are an AI assistant specializing in trading psychology and performance analysis. ` +
        `You're having a conversation with a trader about their day. ` +
        `Given the following trading data for ${dateString}:\n` +
        `Total PnL: $${dayData.pnl.toFixed(2)}\n` +
        `Number of trades: ${dayData.tradeNumber}\n` +
        `Long trades: ${dayData.longNumber}\n` +
        `Short trades: ${dayData.shortNumber}\n` +
        `Trades: ${dayData.trades.map(t => `${t.instrument} (${t.side}): $${t.pnl}`).join(', ')}\n\n` +
        `Conversation history:\n${messages.map(m => `${m.role}: ${m.content}`).join('\n')}\n\n` +
        `User's latest input: ${userInput}\n\n` +
        `Please provide:\n` +
        `1. A brief feedback on the user's response (max 2 sentences)\n` +
        `2. A single, focused follow-up question\n` +
        `3. Whether the conversation should end (true/false)\n` +
        `Be empathetic, insightful, and aim to help the trader reflect deeply on their trading day. ` +
        `Only set shouldEnd to true if the user explicitly indicates they want to end the conversation (e.g., "stop", "end", "that's all"). ` +
        `If the user expresses a desire to end the conversation, provide a brief closing statement instead of a question. ` +
        `Otherwise, continue the conversation as long as the user is engaging and providing substantive responses.`,
      temperature: 0.7,
    });

    let feedback = "";
    let question = "";
    let shouldEnd = false;

    for await (const partialObject of partialObjectStream) {
      if (partialObject.feedback) feedback = partialObject.feedback;
      if (partialObject.question) question = partialObject.question;
      if (partialObject.shouldEnd !== undefined) shouldEnd = partialObject.shouldEnd;
    }

    return { feedback, question, shouldEnd };
  } catch (error) {
    console.error("Error generating reflection response:", error);
    return {
      feedback: "I apologize, but I'm having trouble processing your response.",
      question: "Can you tell me more about your trading experience today?",
      shouldEnd: false
    };
  }
}

export async function generateFollowUp({ dayData, dateString, messages, lastContent }: GenerateFollowUpParams): Promise<{ shouldFollowUp: boolean; feedback: string; question: string }> {
  const lowercaseLastContent = lastContent.toLowerCase()
  if (endConversationKeywords.some(keyword => lowercaseLastContent.includes(keyword))) {
    return { shouldFollowUp: false, feedback: "", question: "" }
  }

  try {
    const { partialObjectStream } = await streamObject({
      model: openai("gpt-4o-mini"),
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