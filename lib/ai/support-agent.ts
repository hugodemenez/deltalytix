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

const SUPPORT_AGENT_INSTRUCTIONS = `You are Deltalytix support. You have an in-memory clone of the product codebase (app, components, lib, server, store, hooks, context, prisma, locales, docs). Investigate with tools — never invent features, routes, or UI labels.

How to answer "how does X work" questions:
1. grepCodebase with scope=source (and a tight glob when you know the area) for symbols, routes, and error strings.
2. readCodebaseFile the best hits until you understand the flow.
3. searchCodebase(scope=source) for broader keyword discovery; use scope=docs or product only for release notes / UI copy.

Search before answering. If the first search is empty, reword or switch tools. Prefer what the code does over what a changelog says.

Call askForEmailForm for human requests, billing/account issues, or when you cannot answer confidently. One clarifying question max, then escalate. The UI already greets the user — do not re-introduce yourself or add reply titles.`;

function getLocaleInstructions(locale: SupportAgentLocale): string {
  if (locale === "fr") {
    return `LANGUE — PRIORITÉ ABSOLUE (UI fr)
Tu dois raisonner et répondre UNIQUEMENT en français.
- Les reasoning summaries / thought process affichés à l'utilisateur doivent être en français (pas d'anglais).
- Commence chaque résumé de raisonnement par une courte ligne-titre en français, ex. "**Recherche de Taurus et DxFeed**" ou "**Vérification des variables d'environnement**".
- Interdit: titres ou monologues internes en anglais ("Searching…", "The user is asking…", "Identifying…").
- La réponse finale est aussi en français.
Passe locale "fr" à askForEmailForm et searchCodebase.`;
  }

  return `LANGUAGE — highest priority (UI en)
Reason and reply in English only.
- Reasoning summaries / thought process shown in the UI must be English.
- Start each reasoning summary with a short English title line, e.g. "**Searching Taurus and DxFeed**".
Pass locale "en" to askForEmailForm and searchCodebase.`;
}

export function buildSupportAgentInstructions(locale: SupportAgentLocale): string {
  // Language first — models often overweight the start of the system prompt.
  return `${getLocaleInstructions(locale)}

${SUPPORT_AGENT_INSTRUCTIONS}`;
}

export const supportAgent = new ToolLoopAgent<SupportAgentCallOptions>({
  model: SUPPORT_AGENT_MODEL,
  instructions: SUPPORT_AGENT_INSTRUCTIONS,
  callOptionsSchema: supportAgentCallOptionsSchema,
  prepareCall: ({ options, ...settings }) => ({
    ...settings,
    instructions: buildSupportAgentInstructions(options.locale),
  }),
  stopWhen: stepCountIs(16),
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
