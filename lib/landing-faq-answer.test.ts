import { describe, expect, it, vi } from "vitest";
import enFaq from "@/locales/en/faq";
import frFaq from "@/locales/fr/faq";
import {
  answerLandingFaqQuestion,
  isLandingFaqAiConfigured,
  landingFaqTokens,
  matchLandingFaqAnswer,
} from "./landing-faq-answer";

describe("landingFaqTokens", () => {
  it("drops stop words and accents", () => {
    expect(landingFaqTokens("Pourquoi Deltalytix trade-t-il pour moi ?")).toEqual(
      ["deltalytix", "trade", "moi"],
    );
  });
});

describe("matchLandingFaqAnswer", () => {
  it("maps the brokerage question to FAQ 1 in English", () => {
    const matched = matchLandingFaqAnswer(
      "Does Deltalytix trade for me?",
      "en",
    );

    expect(matched?.id).toBe("faq-1");
    expect(matched?.answer).toBe(enFaq.faq.answer1);
  });

  it("maps the Plus trial question to FAQ 6 in English", () => {
    const matched = matchLandingFaqAnswer(
      "Why doesn't the Plus plan include a trial?",
      "en",
    );

    expect(matched?.id).toBe("faq-6");
    expect(matched?.answer).toBe(enFaq.faq.answer6);
  });

  it("maps a French self-host question to FAQ 5", () => {
    const matched = matchLandingFaqAnswer(
      "Est-il possible d'exécuter Deltalytix localement ?",
      "fr",
    );

    expect(matched?.id).toBe("faq-5");
    expect(matched?.answer).toBe(frFaq.faq.answer5);
  });

  it("answers a pricing question without quoting an amount", () => {
    const matched = matchLandingFaqAnswer("How much does Plus cost?", "en");

    expect(matched?.id).toBe("pricing");
    expect(matched?.answer).not.toMatch(/€|\$|\d+\.\d{2}/);
    expect(matched?.answer).toContain("pricing section");
  });

  it("returns null for an unrelated question", () => {
    expect(matchLandingFaqAnswer("What is the weather in Lisbon?", "en")).toBeNull();
  });
});

describe("answerLandingFaqQuestion", () => {
  it("returns a published FAQ answer without calling the model", async () => {
    const generate = vi.fn();

    await expect(
      answerLandingFaqQuestion({
        question: "How secure is Deltalytix?",
        locale: "en",
        generate,
      }),
    ).resolves.toEqual({
      answer: enFaq.faq.answer2,
      source: "faq",
    });
    expect(generate).not.toHaveBeenCalled();
  });

  it("returns the localized fallback when nothing matches and AI is off", async () => {
    const generate = vi.fn();

    const result = await answerLandingFaqQuestion({
      question: "Can you wire money to my broker?",
      locale: "en",
      generate,
    });

    expect(result.source).toBe("fallback");
    expect(result.answer).toContain("not a brokerage");
    expect(generate).not.toHaveBeenCalled();
  });

  it("returns a French fallback for an unknown French question", async () => {
    const result = await answerLandingFaqQuestion({
      question: "Pouvez-vous virer de l'argent à mon courtier ?",
      locale: "fr",
    });

    expect(result.source).toBe("fallback");
    expect(result.answer).toContain("pas un courtier");
  });
});

describe("isLandingFaqAiConfigured", () => {
  it("treats a missing or dummy key as unavailable", () => {
    expect(isLandingFaqAiConfigured(undefined)).toBe(false);
    expect(isLandingFaqAiConfigured("dummy")).toBe(false);
    expect(isLandingFaqAiConfigured("sk-live-key")).toBe(true);
  });
});
