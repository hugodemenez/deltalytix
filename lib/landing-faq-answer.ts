import { generateText } from "ai";
import enFaq from "@/locales/en/faq";
import frFaq from "@/locales/fr/faq";

export const LANDING_FAQ_LOCALES = ["en", "fr"] as const;
export type LandingFaqLocale = (typeof LANDING_FAQ_LOCALES)[number];

export const LANDING_FAQ_SOURCES = ["faq", "ai", "fallback"] as const;
export type LandingFaqSource = (typeof LANDING_FAQ_SOURCES)[number];

export const LANDING_FAQ_QUESTION_MAX_LENGTH = 400;
export const LANDING_FAQ_MODEL =
  process.env.LANDING_FAQ_MODEL ?? "openai/gpt-5-nano";

const FAQ_KNOWLEDGE_ITEMS = [1, 2, 3, 4, 5, 6] as const;

type FaqCopy = {
  [K in (typeof FAQ_KNOWLEDGE_ITEMS)[number] as `question${K}` | `answer${K}`]: string;
};

const FAQ_KEYWORDS: Record<(typeof FAQ_KNOWLEDGE_ITEMS)[number], string[]> = {
  1: [
    "trade",
    "broker",
    "brokerage",
    "execute",
    "orders",
    "journal",
    "dashboard",
    "courtier",
    "ordres",
  ],
  2: [
    "secure",
    "security",
    "privacy",
    "encrypt",
    "data",
    "advertising",
    "securite",
    "donnees",
    "confidentialite",
  ],
  3: [
    "sync",
    "synchronise",
    "rithmic",
    "tradovate",
    "thor",
    "oauth",
    "credentials",
    "historique",
  ],
  4: [
    "update",
    "version",
    "install",
    "download",
    "refresh",
    "web",
    "mise",
    "jour",
  ],
  5: [
    "local",
    "selfhost",
    "self-host",
    "docker",
    "bun",
    "agent",
    "localhost",
    "localement",
  ],
  6: ["trial", "essai", "plus", "free", "gratuit", "14", "rolling", "storage"],
};

type KnowledgeEntry = {
  id: string;
  question: string;
  answer: string;
  keywords: string[];
};

const PRODUCT_FACTS: Record<LandingFaqLocale, KnowledgeEntry[]> = {
  en: [
    {
      id: "what-is",
      question: "What is Deltalytix?",
      keywords: ["what", "deltalytix", "journal", "dashboard", "product", "pnl"],
      answer:
        "Deltalytix is a trading journal and dashboard—not a brokerage. You place trades on your broker's platform, then import or sync that history here to read P&L, review statistics, and refine your strategy.",
    },
    {
      id: "pricing",
      question: "How much does Deltalytix cost?",
      keywords: [
        "price",
        "pricing",
        "cost",
        "plan",
        "plus",
        "free",
        "subscribe",
        "payment",
      ],
      answer:
        "Deltalytix has a Free plan with no time limit—trade history is kept on a rolling 14-day window—and a Plus plan with unlimited history and accounts.\n\nCurrent prices are on the pricing section of this page. We do not quote amounts here because they can change.",
    },
    {
      id: "start",
      question: "How do I get started?",
      keywords: ["start", "signup", "account", "begin", "try"],
      answer:
        "Create a Free account and import or sync your trades. The Free plan has no time limit, so you can explore the journal before deciding whether Plus fits.",
    },
  ],
  fr: [
    {
      id: "what-is",
      question: "Qu'est-ce que Deltalytix ?",
      keywords: [
        "quoi",
        "deltalytix",
        "journal",
        "tableau",
        "bord",
        "produit",
        "pnl",
      ],
      answer:
        "Deltalytix est un journal et un tableau de bord de trading—pas un courtier. Vous passez vos ordres chez votre courtier, puis importez ou synchronisez cet historique ici pour lire le P&L, revoir vos statistiques et affiner votre stratégie.",
    },
    {
      id: "pricing",
      question: "Combien coûte Deltalytix ?",
      keywords: [
        "prix",
        "tarif",
        "cout",
        "plan",
        "plus",
        "gratuit",
        "abonnement",
        "paiement",
      ],
      answer:
        "Deltalytix propose un plan Gratuit sans limite de durée—l'historique est conservé sur 14 jours glissants—et un plan Plus avec historique et comptes illimités.\n\nLes prix en vigueur sont dans la section tarifs de cette page. Nous n'indiquons pas de montants ici, car ils peuvent changer.",
    },
    {
      id: "start",
      question: "Comment commencer ?",
      keywords: ["commencer", "inscription", "compte", "essayer", "demarrer"],
      answer:
        "Créez un compte Gratuit et importez ou synchronisez vos trades. Le plan Gratuit n'a pas de limite de durée : vous pouvez explorer le journal avant de décider si Plus vous convient.",
    },
  ],
};

const FALLBACK: Record<LandingFaqLocale, string> = {
  en: "That is not in the published FAQ. Ask support for a precise answer—Deltalytix is a journal and dashboard, not a brokerage, and we only answer from product facts we have already published.",
  fr: "Cette question n'est pas dans la FAQ publiée. Écrivez au support pour une réponse précise—Deltalytix est un journal et un tableau de bord, pas un courtier, et nous ne répondons qu'à partir des faits déjà publiés.",
};

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "at",
  "be",
  "can",
  "ce",
  "ces",
  "cet",
  "cette",
  "comment",
  "could",
  "dans",
  "de",
  "des",
  "did",
  "do",
  "does",
  "du",
  "elle",
  "est",
  "et",
  "for",
  "from",
  "how",
  "i",
  "il",
  "in",
  "is",
  "it",
  "its",
  "je",
  "la",
  "le",
  "les",
  "ma",
  "me",
  "mes",
  "mon",
  "my",
  "ne",
  "nous",
  "of",
  "on",
  "or",
  "ou",
  "our",
  "pas",
  "pour",
  "pourquoi",
  "quel",
  "quelle",
  "quelles",
  "quels",
  "qui",
  "quoi",
  "sa",
  "ses",
  "son",
  "sont",
  "sur",
  "ta",
  "tes",
  "that",
  "the",
  "these",
  "this",
  "those",
  "to",
  "ton",
  "tu",
  "un",
  "une",
  "vous",
  "we",
  "what",
  "when",
  "where",
  "which",
  "who",
  "why",
  "will",
  "with",
  "would",
  "you",
  "your",
]);

export type LandingFaqAnswer = {
  answer: string;
  source: LandingFaqSource;
};

type GenerateTextLike = typeof generateText;

function faqCopy(locale: LandingFaqLocale): FaqCopy {
  return locale === "fr" ? frFaq.faq : enFaq.faq;
}

function publishedFaqEntries(locale: LandingFaqLocale): KnowledgeEntry[] {
  const faq = faqCopy(locale);

  return FAQ_KNOWLEDGE_ITEMS.map((n) => ({
    id: `faq-${n}`,
    question: faq[`question${n}`],
    answer: faq[`answer${n}`],
    keywords: FAQ_KEYWORDS[n],
  }));
}

export function landingFaqKnowledge(locale: LandingFaqLocale): KnowledgeEntry[] {
  return [...publishedFaqEntries(locale), ...PRODUCT_FACTS[locale]];
}

export function isLandingFaqLocale(value: string): value is LandingFaqLocale {
  return value === "en" || value === "fr";
}

export function isLandingFaqAiConfigured(
  apiKey = process.env.OPENAI_API_KEY,
): boolean {
  const key = apiKey?.trim();
  return Boolean(key && key !== "dummy");
}

export function normalizeLandingFaqText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function landingFaqTokens(value: string): string[] {
  return normalizeLandingFaqText(value)
    .split(" ")
    .filter((token) => token.length >= 2 && !STOP_WORDS.has(token));
}

function scoreKnowledgeEntry(
  questionTokens: string[],
  entry: KnowledgeEntry,
): number {
  if (questionTokens.length === 0) return 0;

  const questionSet = new Set(landingFaqTokens(entry.question));
  const keywordSet = new Set(
    entry.keywords.flatMap((keyword) => landingFaqTokens(keyword)),
  );
  const answerSet = new Set(landingFaqTokens(entry.answer));

  let score = 0;
  for (const token of questionTokens) {
    if (questionSet.has(token) || keywordSet.has(token)) {
      score += 2;
    } else if (answerSet.has(token)) {
      score += 0.5;
    }
  }

  return score / questionTokens.length;
}

export function matchLandingFaqAnswer(
  question: string,
  locale: LandingFaqLocale,
): { answer: string; id: string; score: number } | null {
  const questionTokens = landingFaqTokens(question);
  if (questionTokens.length === 0) return null;

  let best: { answer: string; id: string; score: number } | null = null;

  for (const entry of landingFaqKnowledge(locale)) {
    const score = scoreKnowledgeEntry(questionTokens, entry);
    if (!best || score > best.score) {
      best = { answer: entry.answer, id: entry.id, score };
    }
  }

  if (!best || best.score < 0.8) return null;
  return best;
}

function knowledgePrompt(locale: LandingFaqLocale): string {
  const language = locale === "fr" ? "French" : "English";
  const facts = landingFaqKnowledge(locale)
    .map((entry) => `Q: ${entry.question}\nA: ${entry.answer}`)
    .join("\n\n");

  return `You answer landing-page questions about Deltalytix.
Reply in ${language} only, in 1-3 short paragraphs.
Use ONLY the facts below. If the question is not covered, say so and point the reader to support.
Never invent prices, plan amounts, broker claims, or features.
Deltalytix is a trading journal and dashboard, not a brokerage. It does not place or execute trades.

Facts:
${facts}`;
}

function looksLikeInventedPrice(answer: string): boolean {
  return /(?:€|\$|usd|eur)\s*\d|\d[\s.,]?\d{0,3}\s*(?:€|\$|\/mo|\/month|\/mois)/i.test(
    answer,
  );
}

async function generateLandingFaqAnswer(args: {
  question: string;
  locale: LandingFaqLocale;
  generate: GenerateTextLike;
}): Promise<string | null> {
  if (!isLandingFaqAiConfigured()) return null;

  try {
    const { text } = await args.generate({
      model: LANDING_FAQ_MODEL,
      maxOutputTokens: 280,
      providerOptions: {
        openai: {
          reasoningEffort: "none",
        },
      },
      system: knowledgePrompt(args.locale),
      prompt: args.question.trim(),
    });

    const answer = text.trim();
    if (!answer || looksLikeInventedPrice(answer)) return null;
    return answer;
  } catch {
    return null;
  }
}

export async function answerLandingFaqQuestion(args: {
  question: string;
  locale: LandingFaqLocale;
  generate?: GenerateTextLike;
}): Promise<LandingFaqAnswer> {
  const question = args.question.trim();
  const matched = matchLandingFaqAnswer(question, args.locale);

  if (matched && matched.score >= 1.2) {
    return { answer: matched.answer, source: "faq" };
  }

  const generated = await generateLandingFaqAnswer({
    question,
    locale: args.locale,
    generate: args.generate ?? generateText,
  });

  if (generated) {
    return { answer: generated, source: "ai" };
  }

  if (matched) {
    return { answer: matched.answer, source: "faq" };
  }

  return { answer: FALLBACK[args.locale], source: "fallback" };
}
