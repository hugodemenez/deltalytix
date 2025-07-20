import { Toaster } from "@/components/ui/toaster";
import BusinessNavbar from "./components/business-navbar";
import { ThemeProvider } from "@/context/theme-provider";
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

export default async function BusinessLayout(
  props: Readonly<{
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
  }>
) {
  const {
    children,
    params
  } = props;
  
  const { locale } = await params;

  return (
    <ThemeProvider>
        <div className="px-2 sm:px-6 lg:px-32">
          <Toaster />
          <BusinessNavbar />
          <div className="mt-8 sm:mt-20 max-w-screen-xl mx-auto">
            {children}
          </div>
        </div>
    </ThemeProvider>
  );
}