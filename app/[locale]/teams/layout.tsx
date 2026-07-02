
import { ThemeProvider } from "@/context/theme-provider";
import { Metadata } from 'next';
import { I18nProviderClient } from "@/locales/client";
import { truncateForSocialDescription } from "@/lib/og/site-metadata";

type Locale = 'en' | 'fr';

const TEAM_TITLES: Record<Locale, string> = {
  en: "Deltalytix Teams — Trading Analytics for Fund Managers",
  fr: "Deltalytix Teams — Analyses de trading pour équipes",
};

const TEAM_DESCRIPTIONS: Record<Locale, string> = {
  en:
    "Team trading analytics for fund managers, prop firms, and trading desks. Monitor traders, track performance, and make data-driven decisions.",
  fr:
    "Analyses de trading pour gestionnaires de fonds, prop firms et équipes. Suivez les traders et pilotez vos décisions.",
};

export async function generateMetadata(props: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const params = await props.params;
  const description = truncateForSocialDescription(
    TEAM_DESCRIPTIONS[params.locale] || TEAM_DESCRIPTIONS.en,
  );

  return {
    title: TEAM_TITLES[params.locale] || TEAM_TITLES.en,
    description,
  };
}

export default async function TeamLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <I18nProviderClient locale={locale}>
      <ThemeProvider>
        {children}
      </ThemeProvider>
    </I18nProviderClient>
  );
}