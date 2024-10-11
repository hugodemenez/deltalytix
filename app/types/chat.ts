import { CalendarEntry } from "@/lib/types";

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  image?: string;
}

export interface GenerateReflectionQuestionParams {
  dayData: CalendarEntry;
  dateString: string;
  messages: ChatMessage[];
  userInput: string;
  isInitialGreeting?: boolean;
  userName?: string;
  lastQuestion?: string; // Add this line
}

// Update the return type of generateReflectionQuestion
export interface ReflectionQuestionResponse {
  greeting?: string;
  response: string;
  question?: string;
  shouldEnd: boolean;
}

export type GenerateFollowUpParams = {
  dayData: CalendarEntry;
  dateString: string;
  messages: ChatMessage[];
  lastContent: string;
}