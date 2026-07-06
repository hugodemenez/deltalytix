import { Toaster } from "@/components/ui/sonner";
import Navbar from "./components/navbar";
import Footer from "./components/footer";
import { ThemeProvider } from "@/context/theme-provider";
import { I18nProviderClient } from "@/locales/landing-client";
import { ConsentBanner } from "@/components/consent-banner";

import { Metadata } from 'next';
import { getSiteMetadataCopy } from "@/lib/og/site-metadata";

type Locale = 'en' | 'fr';
const TITLE_TEMPLATE = "%s | Deltalytix";

export async function generateMetadata(props: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const params = await props.params;
  const copy = getSiteMetadataCopy(params.locale);

  return {
    title: {
      absolute: copy.title,
      template: TITLE_TEMPLATE,
    },
    description: copy.description,
    openGraph: {
      title: copy.title,
      description: copy.description,
      locale: params.locale === "fr" ? "fr_FR" : "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: copy.title,
      description: copy.description,
    },
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
  
  const { locale } = await params;

  return (
    <ThemeProvider>
      <I18nProviderClient locale={locale}>
        <ConsentBanner />
        <div className="px-2 sm:px-6 lg:px-32">
          <Toaster />
          <Navbar />
          <div className="mt-8 sm:mt-20 max-w-(--breakpoint-xl) mx-auto">
            {children}
          </div>
          <Footer />
        </div>
      </I18nProviderClient>
    </ThemeProvider>
  );
}
