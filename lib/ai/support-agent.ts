import { ToolLoopAgent, stepCountIs } from "ai";
import { z } from "zod";
import { askForEmailForm } from "@/app/api/ai/support/tools/ask-for-email-form";
import {
  grepCodebaseTool,
  listCodebaseFilesTool,
  readCodebaseFileTool,
  searchCodebaseTool,
} from "@/app/api/ai/support/tools/search-codebase";
import {
  supportAgentLocaleSchema,
  type SupportAgentLocale,
} from "@/app/api/ai/support/schema";

/**
 * Tool-loop search needs a model that reliably chains calls; nano tends to
 * answer from memory instead of searching. Override per environment if needed.
 */
const SUPPORT_AGENT_MODEL = process.env.SUPPORT_AGENT_MODEL ?? "openai/gpt-5-mini";

export type { SupportAgentLocale };

export const supportAgentCallOptionsSchema = z.object({
  locale: supportAgentLocaleSchema,
});

export type SupportAgentCallOptions = z.infer<typeof supportAgentCallOptionsSchema>;

const SUPPORT_AGENT_INSTRUCTIONS = `You are Deltalytix support. Use tools to answer product questions; do not invent features or UI labels.

Tools: searchCodebase (default), grepCodebase (exact strings), readCodebaseFile, listCodebaseFiles, askForEmailForm. Search before answering; try a second query if the first is empty.

Call askForEmailForm when the user asks for a human, for billing/account issues, or when you cannot answer confidently. One clarifying question max, then escalate. The UI already greets the user and offers human support — do not re-introduce yourself or add reply titles.`;

function getLocaleInstructions(locale: SupportAgentLocale): string {
  const language = locale === "fr" ? "French" : "English";

  return `Reply in ${language} (UI locale ${locale}). Pass locale "${locale}" to askForEmailForm and searchCodebase. Keep reasoning short and in ${language}.`;
}

export function buildSupportAgentInstructions(locale: SupportAgentLocale): string {
  return `${SUPPORT_AGENT_INSTRUCTIONS}

${getLocaleInstructions(locale)}`;
}

export const supportAgent = new ToolLoopAgent<SupportAgentCallOptions>({
  model: SUPPORT_AGENT_MODEL,
  instructions: SUPPORT_AGENT_INSTRUCTIONS,
  callOptionsSchema: supportAgentCallOptionsSchema,
  prepareCall: ({ options, ...settings }) => ({
    ...settings,
    instructions: buildSupportAgentInstructions(options.locale),
  }),
  stopWhen: stepCountIs(12),
  providerOptions: {
    openai: {
      reasoningEffort: "low",
      reasoningSummary: "auto",
    },
  },
  tools: {
    searchCodebase: searchCodebaseTool,
    grepCodebase: grepCodebaseTool,
    readCodebaseFile: readCodebaseFileTool,
    listCodebaseFiles: listCodebaseFilesTool,
    askForEmailForm,
  },
});

export { SUPPORT_AGENT_MODEL };
