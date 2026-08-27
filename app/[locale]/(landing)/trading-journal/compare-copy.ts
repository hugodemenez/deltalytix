export const COMPARE_COPY_BY_LOCALE = {
  en: {
    hub: {
      eyebrow: "Trading journal · Futures",
      title: "One trading journal for every futures account.",
      lede: "Import your brokers and funded accounts, then read P&L in one place.",
      journalsHeading: "Journals comparison",
      usChip: "Us",
      youAreHere: "You’re here",
      viewMore: "View more →",
      afterHeading: "Start free, forever.",
      afterLede: "Plus from 19.99/month when you need more than 2 weeks. Or Lifetime.",
      usOneLiner: "Import your futures. Read P&L in one journal.",
    },
    oneToOne: {
      breadcrumbJournal: "Trading journal",
      breadcrumbFutures: "Futures",
      title: (name: string) => `Deltalytix vs ${name}.`,
      usLabel: "Deltalytix",
      footerHeading: "One journal for every futures account.",
      footerLead: "Start free, forever.",
      footerLede: "Plus from 19.99/month when you need more than 2 weeks. Or Lifetime.",
    },
    cta: {
      getStarted: "Get Started",
      seePricing: "See pricing",
    },
  },
  fr: {
    hub: {
      eyebrow: "Journal de trading · Futures",
      title: "Un journal de trading pour tous vos comptes futures.",
      lede: "Importez vos brokers et vos comptes funded, puis lisez le P&L au même endroit.",
      journalsHeading: "Comparaison des journaux",
      usChip: "Nous",
      youAreHere: "Vous êtes ici",
      viewMore: "Voir plus →",
      afterHeading: "Commencez gratuitement, pour de bon.",
      afterLede: "Plus à partir de 19,99 €/mois quand vous avez besoin de plus de 2 semaines. Ou Lifetime.",
      usOneLiner: "Importez vos futures. Lisez le P&L dans un seul journal.",
    },
    oneToOne: {
      breadcrumbJournal: "Journal de trading",
      breadcrumbFutures: "Futures",
      title: (name: string) => `Deltalytix vs ${name}.`,
      usLabel: "Deltalytix",
      footerHeading: "Un journal pour tous vos comptes futures.",
      footerLead: "Commencez gratuitement, pour de bon.",
      footerLede: "Plus à partir de 19,99 €/mois quand vous avez besoin de plus de 2 semaines. Ou Lifetime.",
    },
    cta: {
      getStarted: "Commencer",
      seePricing: "Voir les tarifs",
    },
  },
} as const;

export type CompareCopyLocale = keyof typeof COMPARE_COPY_BY_LOCALE;

export function getCompareCopy(locale: string) {
  return locale.startsWith("fr")
    ? COMPARE_COPY_BY_LOCALE.fr
    : COMPARE_COPY_BY_LOCALE.en;
}

/** @deprecated EN default for existing imports; prefer getCompareCopy(locale). */
export const COMPARE_COPY = COMPARE_COPY_BY_LOCALE.en;

export const COMPARE_GET_STARTED_HREF = "/dashboard";
export const COMPARE_PRICING_HREF = "/pricing";
