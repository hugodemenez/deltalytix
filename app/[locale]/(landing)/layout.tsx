import { Toaster } from "@/components/ui/sonner";
import Navbar from "./components/navbar";
import Footer from "./components/footer";
import { ThemeProvider } from "@/context/theme-provider";

import { Metadata } from 'next';

type Locale = 'en' | 'fr';

export async function generateMetadata(props: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const params = await props.params;
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

export default async function RootLayout(
  props: Readonly<{
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
  }>
) {
  const {
    children,
    params
  } = props;
  
  // Await the params since it's now a Promise in Next.js 15
  const { locale } = await params;

  return (
    <ThemeProvider>
        <div className="px-2 sm:px-6 lg:px-32">
          <Toaster />
          <Navbar />
          <div className="mt-8 sm:mt-20 max-w-(--breakpoint-xl) mx-auto">
            {children}
          </div>
          <Footer />
        </div>
    </ThemeProvider>
  );
}
