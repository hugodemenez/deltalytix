import { generateText } from "ai";
import type { SupportAgentLocale } from "@/app/api/ai/support/schema";

/**
 * Cheap, high-throughput model for short instruction tasks (title translation).
 * Disable reasoning — latency matters more than depth here.
 */
export const REASONING_LABEL_TRANSLATE_MODEL =
  process.env.REASONING_LABEL_TRANSLATE_MODEL ?? "openai/gpt-5-nano";

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
    model: REASONING_LABEL_TRANSLATE_MODEL,
    maxOutputTokens: 80,
    providerOptions: {
      openai: {
        reasoningEffort: "none",
      },
    },
    prompt: `Translate this short UI title into ${language}.
Return only the translation — no quotes, no punctuation changes beyond what's needed, no explanation.

Title:
${source}`,
  });

  return text.trim().replace(/^["']|["']$/g, "") || source;
}
