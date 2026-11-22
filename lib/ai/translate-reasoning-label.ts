import { generateText } from "ai";
import type { SupportAgentLocale } from "@/app/api/ai/support/schema";
import { resolveAiTask } from "@/lib/ai/resolve-ai-task";

/**
 * Short title translation. Model, effort none, and the 80-token cap come from
 * the `reasoning-label` task. The support agent's own summary stays at
 * effort low so this title has something to translate.
 */

const LOCALE_LANGUAGE: Record<SupportAgentLocale, string> = {
  en: "English",
  fr: "French",
};

export async function translateReasoningLabel(args: {
  text: string;
  locale: SupportAgentLocale;
}): Promise<string> {
  const source = args.text.trim();
  if (!source) return "";
  if (args.locale === "en") return source;

  const language = LOCALE_LANGUAGE[args.locale];

  const { text } = await generateText({
    ...resolveAiTask("reasoning-label"),
    prompt: `Translate this short UI title into ${language}.
Return only the translation — no quotes, no punctuation changes beyond what's needed, no explanation.

Title:
${source}`,
  });

  return text.trim().replace(/^["']|["']$/g, "") || source;
}
