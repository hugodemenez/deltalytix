'use server'

import { openai } from "@ai-sdk/openai"
import { streamObject } from "ai"
import { z } from "zod"
import { GenerateReflectionQuestionParams, GenerateFollowUpParams, ReflectionQuestionResponse } from "@/types/chat"
import { groupBy } from '@/lib/utils';

// Common function to generate account summaries
function generateAccountSummaries(trades: any[]) {
  const accountGroups = groupBy(trades, 'accountNumber');
  return Object.entries(accountGroups).map(([accountNumber, trades]) => {
    const accountPnL = trades.reduce((sum: number, trade: any) => sum + trade.pnl, 0);
    const accountCommission = trades.reduce((sum: number, trade: any) => sum + trade.commission, 0);
    const longTrades = trades.filter((t: any) => t.side === 'long').length;
    const shortTrades = trades.filter((t: any) => t.side === 'short').length;
    return `Account ${accountNumber}: PnL: $${(accountPnL - accountCommission).toFixed(2)}, Commission: $${accountCommission.toFixed(2)}, Long: ${longTrades}, Short: ${shortTrades}`;
  }).join('\n');
}

// Common function to generate trade summaries
function generateTradeSummaries(trades: any[]) {
  return trades.map(t => `${t.instrument} (${t.side}, Account ${t.accountNumber}), Time: ${t.entryDate}, PnL: $${t.pnl}`).join(', ');
}

// Common prompt parts
const commonPromptParts = {
  introduction: `You are an AI assistant specializing in trading psychology and performance analysis on Deltalytix, a comprehensive trading journal and statistics platform. Your role is to provide insightful, concise, and personalized feedback to traders based on their daily performance across multiple accounts.`,
  guidelines: `
    Guidelines:
    - Keep responses brief and focused, typically 1-2 sentences.
    - Aim for a concise conversation (3-5 total exchanges).
    - Make questions thought-provoking but concise, considering performance across different accounts.
    - Use emojis sparingly to keep the conversation engaging and professional.
    - Be responsive to the user's input, acknowledging new information.
    - Provide insights directly related to the user's input or trading data across accounts.
    - Avoid repeating previous questions or topics.
    - Consider the multi-account nature of trading on Deltalytix in your analysis.
  `
};

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
    const accountSummaries = generateAccountSummaries(dayData.trades);
    const tradeSummaries = generateTradeSummaries(dayData.trades);

    const { partialObjectStream } = await streamObject({
      model: openai("gpt-3.5-turbo"),
      schema: z.object({
        greeting: z.string().optional().describe("A personalized greeting based on the trading data"),
        response: z.string().describe("A concise response to the user's input"),
        question: z.string().optional().describe("A follow-up question to help the user reflect on their trading day, if appropriate"),
        shouldEnd: z.boolean().describe("Whether the conversation should end"),
      }),
      prompt: `
        ${commonPromptParts.introduction}
        
        ${isInitialGreeting ? `
          Generate a personalized greeting, a concise initial response with trading details, and a follow-up question based on the following trading data for ${dateString}:
          Trader's name: ${userName}
        ` : `
          You're having a concise conversation with a trader about their day across multiple accounts. 
          Given the following trading data for ${dateString}:
        `}

        Account Summaries:
        ${accountSummaries}
        
        Trades: ${tradeSummaries}
        
        ${!isInitialGreeting ? `
          Conversation history:
          ${messages.map(m => `${m.role}: ${m.content}`).join('\n')}
          
          User's latest input: ${userInput}
          
          Last question asked: ${lastQuestion}
        ` : ''}
        
        Please provide:
        ${isInitialGreeting ? `
          1. A single personalized greeting that addresses the trader by name (identify first name if you can, don't use last name)
          2. A single response which summarizes all trades across instruments and accounts and details the performance for each account
          3. A single, focused initial question to start the reflection process (like a journal question). Be inventive and engaging.
        ` : `
          1. A concise response to the user's input. This may include a brief insight. Don't ask any questions in the response.
          2. A follow-up question, if appropriate. Make it relevant to the user's last input or a new aspect of their trading day, considering the multiple accounts.
          3. Whether the conversation should end (true/false)
        `}
        
        ${commonPromptParts.guidelines}
        
        ${!isInitialGreeting ? `
          Important: 
          - Set shouldEnd to true only if the user explicitly indicates they want to end the conversation.
        ` : ''}
      `,
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

