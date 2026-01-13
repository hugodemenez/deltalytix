import { getBasePrompt } from "./base";
import { FORMATTING_PROMPT } from "./formatting";
import { TOOLS_PROMPT } from "./tools";
import { INITIALIZATION_PROMPT } from "./initialization";
import { CAPABILITIES_PROMPT } from "./capabilities";
import { STYLE_PROMPT } from "./style";

export interface PromptParams {
  locale: string;
  username?: string;
  timezone: string;
  currentWeekStart: Date;
  currentWeekEnd: Date;
  previousWeekStart: Date;
  previousWeekEnd: Date;
  isFirstMessage: boolean;
}

export function buildSystemPrompt(params: PromptParams): string {
  const { isFirstMessage, ...baseParams } = params;
  
  const base = getBasePrompt(baseParams);
  const parts = [
    base,
    FORMATTING_PROMPT,
    TOOLS_PROMPT,
    ...(isFirstMessage ? [INITIALIZATION_PROMPT] : [CAPABILITIES_PROMPT]),
    STYLE_PROMPT,
  ];

  return parts.join("\n\n");
}
