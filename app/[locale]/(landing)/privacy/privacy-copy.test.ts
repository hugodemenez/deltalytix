import { describe, expect, it } from "vitest";

import en from "@/locales/en/privacy";
import fr from "@/locales/fr/privacy";

describe("privacy analytics copy", () => {
  it("states cookieless measurement before consent and the regional opt-out (EN)", () => {
    expect(en.privacy.analytics.beforeConsent).toMatch(/no cookies/i);
    expect(en.privacy.analytics.beforeConsent).toMatch(/no localStorage/i);
    expect(en.privacy.analytics.beforeConsent).toMatch(/no stored identifier/i);
    expect(en.privacy.analytics.beforeConsent).toMatch(/no session replay/i);
    expect(en.privacy.analytics.otherRegions).toMatch(/opt out/i);
    expect(en.privacy.analytics.otherRegions).toMatch(/United States/i);
    expect(en.privacy.analytics.conversions).toMatch(/pseudonymous/i);
    expect(en.privacy.thirdParty.content).not.toMatch(
      /We do not use third-party analytics services/,
    );
  });

  it("states the same facts in French", () => {
    expect(fr.privacy.analytics.beforeConsent).toMatch(/sans cookie/i);
    expect(fr.privacy.analytics.beforeConsent).toMatch(/sans localStorage/i);
    expect(fr.privacy.analytics.beforeConsent).toMatch(/sans identifiant stocké/i);
    expect(fr.privacy.analytics.beforeConsent).toMatch(/sans replay/i);
    expect(fr.privacy.analytics.otherRegions).toMatch(/États-Unis/);
    expect(fr.privacy.thirdParty.content).not.toMatch(
      /Nous n'utilisons pas de services d'analyse tiers/,
    );
  });
});
