export const SOCIAL_DESCRIPTION_MAX_LENGTH = 125;

export type OgLocale = "en" | "fr";

export type SiteMetadataCopy = {
  title: string;
  description: string;
  ogHeadline: string;
  ogSubheadline: string;
  ogCta: string;
  ogAlt: string;
};

const SITE_METADATA: Record<OgLocale, SiteMetadataCopy> = {
  en: {
    title: "Deltalytix — Trading Analytics Dashboard for Futures Traders",
    description:
      "Deltalytix is a trading dashboard for futures traders. Store, explore, and understand your track-record across brokers.",
    ogHeadline: "Master your trading journey",
    ogSubheadline: "Real-time analytics, journaling, and performance insights for futures traders.",
    ogCta: "Get Started Free →",
    ogAlt: "Deltalytix trading analytics dashboard — Get Started Free",
  },
  fr: {
    title: "Deltalytix — Tableau de bord de trading pour traders futures",
    description:
      "Deltalytix est un journal de trading pour traders futures. Centralisez, analysez et comprenez vos performances.",
    ogHeadline: "Maîtrisez votre parcours de trading",
    ogSubheadline:
      "Analyses en temps réel, journal et insights de performance pour traders futures.",
    ogCta: "Commencer gratuitement →",
    ogAlt: "Tableau de bord Deltalytix — Commencer gratuitement",
  },
};

const UPDATES_OG_COPY: Record<OgLocale, { cta: string; alt: string }> = {
  en: {
    cta: "Read the Changelog →",
    alt: "Deltalytix product update — Read the Changelog",
  },
  fr: {
    cta: "Lire les changements →",
    alt: "Mise à jour Deltalytix — Lire les changements",
  },
};

const SHARED_OG_COPY: Record<OgLocale, { cta: string; alt: string }> = {
  en: {
    cta: "View Performance →",
    alt: "Shared Deltalytix trading performance — View Performance",
  },
  fr: {
    cta: "Voir la performance →",
    alt: "Performance de trading Deltalytix partagée — Voir la performance",
  },
};

export function resolveOgLocale(locale: string | undefined): OgLocale {
  return locale === "fr" ? "fr" : "en";
}

export function getSiteMetadataCopy(locale: string | undefined): SiteMetadataCopy {
  return SITE_METADATA[resolveOgLocale(locale)];
}

export function getUpdatesOgCopy(locale: string | undefined) {
  return UPDATES_OG_COPY[resolveOgLocale(locale)];
}

export function getSharedOgCopy(locale: string | undefined) {
  return SHARED_OG_COPY[resolveOgLocale(locale)];
}

export function truncateForSocialDescription(
  text: string,
  maxLength = SOCIAL_DESCRIPTION_MAX_LENGTH,
): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  const truncated = normalized.slice(0, maxLength - 1).trimEnd();
  const lastSpace = truncated.lastIndexOf(" ");
  const safe = lastSpace > maxLength * 0.6 ? truncated.slice(0, lastSpace) : truncated;

  return `${safe}…`;
}
