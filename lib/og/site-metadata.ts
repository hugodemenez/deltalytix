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
    // Match landing hero cadence: brand-first display line + quiet supporting sentence.
    ogHeadline: "Master your trading journey.",
    ogSubheadline:
      "Store, explore, and understand your track-record across brokers.",
    ogCta: "Get Started →",
    ogAlt:
      "Deltalytix — Master your trading journey. Trading analytics for futures traders. Get Started.",
  },
  fr: {
    title: "Deltalytix — Tableau de bord de trading pour traders futures",
    description:
      "Deltalytix est un journal de trading pour traders futures. Centralisez, analysez et comprenez vos performances.",
    ogHeadline: "Votre journal de trading.",
    ogSubheadline:
      "Stockez, explorez et comprenez votre historique de trading futures.",
    ogCta: "Commencer maintenant →",
    ogAlt:
      "Deltalytix — Votre journal de trading. Analyses pour traders futures. Commencer maintenant.",
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

const CONNECTIONS_METADATA: Record<OgLocale, SiteMetadataCopy> = {
  en: {
    title: "Connections — Sync Brokers on Deltalytix",
    description:
      "Manage broker connections and sync trading accounts across Rithmic, Tradovate, and more.",
    ogHeadline: "Connect your brokers.",
    ogSubheadline:
      "Manage connections and sync trading accounts in one place.",
    ogCta: "Open Connections →",
    ogAlt:
      "Deltalytix — Connect your brokers. Manage connections and sync trading accounts. Open Connections.",
  },
  fr: {
    title: "Connexions — Synchronisez vos brokers sur Deltalytix",
    description:
      "Gérez vos connexions broker et synchronisez vos comptes Rithmic, Tradovate et plus encore.",
    ogHeadline: "Connectez vos brokers.",
    ogSubheadline:
      "Gérez vos connexions et synchronisez vos comptes au même endroit.",
    ogCta: "Ouvrir les connexions →",
    ogAlt:
      "Deltalytix — Connectez vos brokers. Gérez vos connexions et synchronisez vos comptes. Ouvrir les connexions.",
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

export function getConnectionsMetadataCopy(
  locale: string | undefined,
): SiteMetadataCopy {
  return CONNECTIONS_METADATA[resolveOgLocale(locale)];
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
