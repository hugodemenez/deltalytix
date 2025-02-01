import { UserDataProvider } from "@/components/context/user-data";
import { Toaster } from "@/components/ui/toaster";
import Navbar from "./components/landing-navbar";
import Footer from "./components/footer";
import { ThemeProvider } from "@/components/context/theme-provider";
import { I18nProviderClient } from "@/locales/client";

import { Metadata } from 'next';

type Locale = 'en' | 'fr';

export async function generateMetadata({ params }: { params: { locale: Locale } }): Promise<Metadata> {
  const descriptions: Record<Locale, string> = {
    en: 'Centralize and visualize your trading performance across multiple brokers. Track, analyze, and improve your trading journey with powerful analytics.',
    fr: 'Centralisez et visualisez vos performances de trading à travers différents brokers. Suivez, analysez et améliorez votre parcours de trading avec des analyses puissantes.',
  };

  const description = descriptions[params.locale] || descriptions.en;

  return {
    title: 'Deltalytix',
    description,
  };
}

export default async function RootLayout({
  children,
  params: { locale },
}: Readonly<{
  children: React.ReactNode;
  params: { locale: string };
}>) {



  return (
    <I18nProviderClient locale={locale}>
    <ThemeProvider>
        <UserDataProvider>
        <div className="px-2 sm:px-6 lg:px-32">
        <Toaster />
        <Navbar />
        <div className="mt-8 sm:mt-20 max-w-screen-xl mx-auto">
        {children}
        </div>
        <Footer />
        </div>
        </UserDataProvider>
    </ThemeProvider>
    </I18nProviderClient>
  );
}
