
import { ThemeProvider } from "@/context/theme-provider";
import { Metadata } from 'next';
import { Suspense } from "react";
import { AuthProfileButton } from "./components/auth-profile-button";
import { AuthProfileButtonSkeleton } from "./components/auth-profile-button-skeleton";

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

export default async function BusinessLayout({
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