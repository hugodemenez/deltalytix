
import { AuthProfileButton } from "../components/auth-profile-button";
import TeamNavbar from "../components/team-navbar";
import { Metadata } from 'next';

type Locale = 'en' | 'fr';

export async function generateMetadata(props: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const params = await props.params;
  const descriptions: Record<Locale, string> = {
    en: 'Enterprise trading analytics platform for fund managers and proprietary trading firms. Monitor multiple traders, track performance, and make data-driven decisions.',
    fr: 'Plateforme d\'analyses de trading entreprise pour les gestionnaires de fonds et les firmes de trading propriétaire. Surveillez plusieurs traders, suivez les performances et prenez des décisions basées sur les données.',
  };

  const description = descriptions[params.locale] || descriptions.en;

  return {
    title: 'Deltalytix Enterprise',
    description,
  };
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