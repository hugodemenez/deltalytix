import { describe, expect, it } from "vitest";
import { getReferralOgCopy } from "./referral-copy";

describe("getReferralOgCopy", () => {
  it("returns French copy for fr locale", async () => {
    const copy = await getReferralOgCopy("fr");
    expect(copy.joinLabel).toBe("Rejoignez avec un code de parrainage");
    expect(copy.tagline).toBe("Journal de trading nouvelle génération");
    expect(copy.cta).toBe("Inscrivez-vous avec le code →");
  });

  it("returns English copy for en locale", async () => {
    const copy = await getReferralOgCopy("en");
    expect(copy.joinLabel).toBe("Join with a referral code");
    expect(copy.tagline).toBe("Next generation trading dashboard");
    expect(copy.cta).toBe("Sign Up with Code →");
  });

  it("falls back to English for unsupported locales", async () => {
    const copy = await getReferralOgCopy("de");
    expect(copy.joinLabel).toBe("Join with a referral code");
  });
});
