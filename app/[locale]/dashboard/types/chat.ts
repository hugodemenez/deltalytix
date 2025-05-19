import { CalendarEntry } from "./calendar";

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
  lastQuestion?: string;
}

export interface ReflectionQuestionResponse {
  greeting?: string;
  response: string;
  question?: string;
  shouldEnd: boolean;
}

export interface GenerateFollowUpParams {
  dayData: CalendarEntry;
  dateString: string;
  messages: ChatMessage[];
  lastContent: string;
}
