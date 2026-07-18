import { AuthProfileButton } from "../components/auth-profile-button";
import TeamNavbar from "../components/team-navbar";
import { Metadata } from 'next';
import { cacheLife } from 'next/cache';
import { truncateForSocialDescription } from "@/lib/og/site-metadata";
import { resolveLocale } from "@/lib/locale-params";

type Locale = 'en' | 'fr';

const TEAM_TITLES: Record<Locale, string> = {
  en: "Deltalytix Enterprise — Team Trading Analytics Platform",
  fr: "Deltalytix Enterprise — Analyses de trading pour équipes",
};

const TEAM_DESCRIPTIONS: Record<Locale, string> = {
  en:
    "Enterprise trading analytics for fund managers and prop firms. Monitor traders, track performance, and make data-driven decisions.",
  fr:
    "Analyses de trading entreprise pour gestionnaires de fonds et prop firms. Suivez les traders et pilotez vos décisions.",
};

async function getCachedTeamLandingMetadata(locale: Locale): Promise<Metadata> {
  "use cache";
  cacheLife("max");

  const description = truncateForSocialDescription(
    TEAM_DESCRIPTIONS[locale] || TEAM_DESCRIPTIONS.en,
  );

  return {
    title: TEAM_TITLES[locale] || TEAM_TITLES.en,
    description,
  };
}

export async function generateMetadata(props: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const locale = (await resolveLocale(props.params)) as Locale;
  return getCachedTeamLandingMetadata(locale);
}

export default async function TeamLayout({
  children
}: {
  children: React.ReactNode,
}
) {
  return (
    <div className="px-2 sm:px-6 lg:px-32">
      <div className="flex justify-between items-center py-4">
      <TeamNavbar />
      <AuthProfileButton />
      </div>
      <div className="mt-8 sm:mt-20 mx-auto">
        {children}
      </div>
    </div>
  );
}