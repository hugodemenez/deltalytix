import { Toaster } from "@/components/ui/sonner";
import Navbar from "./components/navbar";
import Footer from "./components/footer";
import { ThemeProvider } from "@/context/theme-provider";
import { I18nProviderClient } from "@/locales/landing-client";
import { ConsentBanner } from "@/components/consent-banner";

import { Metadata } from "next";
import { getSiteMetadataCopy } from "@/lib/og/site-metadata";

type Locale = "en" | "fr";
const TITLE_TEMPLATE = "%s | Deltalytix";

export async function generateMetadata(props: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
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
  }>,
) {
  const { children, params } = props;

  const { locale } = await params;

  return (
    <ThemeProvider>
      <I18nProviderClient locale={locale}>
        <ConsentBanner />
        <div className="min-h-screen bg-[#f5f5f5] text-[#171717] [--background:0_0%_96.1%] [--card:0_0%_100%] [--foreground:0_0%_9%] dark:bg-[#111111] dark:text-[#ededed] dark:[--background:0_0%_6.7%] dark:[--card:0_0%_0%] dark:[--foreground:0_0%_93%]">
          <Toaster />
          <Navbar />
          <div className="pt-14">{children}</div>
          <Footer />
        </div>
      </I18nProviderClient>
    </ThemeProvider>
  );
}
