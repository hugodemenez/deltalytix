import { CalendarEntry } from "@/components/calendar/calendar-pnl"

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  image?: string;
}

export type GenerateReflectionQuestionParams = {
  dayData: CalendarEntry;
  dateString: string;
  messages: ChatMessage[];
  userInput: string;
}

export type GenerateFollowUpParams = {
  dayData: CalendarEntry;
  dateString: string;
  messages: ChatMessage[];
  lastContent: string;
}