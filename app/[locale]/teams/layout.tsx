
import { ThemeProvider } from "@/context/theme-provider";
import { Metadata } from 'next';

type Locale = 'en' | 'fr';

export async function generateMetadata(props: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const params = await props.params;
  const descriptions: Record<Locale, string> = {
    en: 'Teams trading analytics platform for fund managers, proprietary trading firms and trading teams. Monitor multiple traders, track performance, and make data-driven decisions.',
    fr: 'Plateforme d\'analyses de trading pour les gestionnaires de fonds, les propfirms et les équipes de trading. Suivez les performances de vos traders et prenez des décisions basées sur les données.',
  };

  const description = descriptions[params.locale] || descriptions.en;

  return {
    title: 'Deltalytix Teams',
    description,
  };
}

export default async function TeamLayout({
  children
}: {
  children: React.ReactNode,
}) {
  return (
    <ThemeProvider>
      {children}
    </ThemeProvider>
  );
}