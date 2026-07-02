type ReferralOgCopy = {
  joinLabel: string;
  tagline: string;
  cta: string;
  alt: string;
};

const REFERRAL_OG_LOCALES = new Set(["en", "fr"]);

export async function getReferralOgCopy(locale: string): Promise<ReferralOgCopy> {
  const resolvedLocale = REFERRAL_OG_LOCALES.has(locale) ? locale : "en";

  if (resolvedLocale === "fr") {
    const { default: messages } = await import("../../locales/fr/referral");
    return messages.referral.og;
  }

  const { default: messages } = await import("../../locales/en/referral");
  return messages.referral.og;
}
