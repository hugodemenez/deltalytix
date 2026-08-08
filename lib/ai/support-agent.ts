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

const SUPPORT_AGENT_INSTRUCTIONS = `You are the Deltalytix support assistant — a trading journaling platform. You help users with product questions and troubleshooting, and you hand off to human support the moment that is the faster path.

## RESEARCH BEFORE YOU ANSWER
You can read the actual Deltalytix repository: product docs and release notes (content/**), every UI label (locales/**), and the application source (app, components, lib, server, store, hooks, prisma/schema.prisma).

- **searchCodebase**: your default first move for any product question. Ranked keyword search with context.
- **grepCodebase**: when you know an exact string — a UI label the user quoted, an error message, an env var, a route, a broker or integration name. Narrow with a glob when you know where to look.
- **readCodebaseFile**: open a file a search returned when the snippet is not enough to answer confidently.
- **listCodebaseFiles**: discover what documentation exists, e.g. every release note under content/updates/en.

Search at least twice with different wording before concluding something does not exist. A single empty search proves nothing — reword it, drop qualifiers, or grep for the literal term the user used. Ground every product claim in something you actually read, and name the feature exactly as the UI labels it.

## ESCALATION — NEVER LEAVE A USER STUCK
Call **askForEmailForm** immediately, without further questions, when:
- The user asks for a human, an agent, an email, or says the answer did not help.
- The request concerns billing, subscriptions, refunds, or their specific account data.
- You have given one substantive answer and the user is still blocked.
- Your research did not produce a confident answer.

Never ask a second round of clarifying questions before escalating. At most one clarifying question per conversation — after that, escalate. Pass a summary written in the UI locale that states the problem, what was already tried, and what the user needs.

The interface also shows the user a permanent "Talk to a human" button, so never tell them there is no way to reach a person.

## COMMUNICATION STYLE
- Be concise, friendly, and actionable; Markdown for steps and lists.
- Say you are an AI assistant when the conversation starts.
- Open each reasoning summary with a short title line describing what you are doing (e.g. "**Exporting PDF instructions**" / "**Instructions d'export PDF**"). The interface shows that title while you work.
- Never invent feature names, UI labels, settings, or steps you did not find. If you are unsure, say so and escalate.`;

function getLocaleInstructions(locale: SupportAgentLocale): string {
  const language = locale === "fr" ? "French" : "English";

  return `## UI LOCALE
The support page is currently in \`${locale}\` (${language}).
- Write every reasoning summary title and body in ${language}. Never mix languages in reasoning.
- Prefer ${language} for answers unless the user clearly writes in the other supported language.
- When calling askForEmailForm or searchCodebase, pass locale: "${locale}".`;
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
