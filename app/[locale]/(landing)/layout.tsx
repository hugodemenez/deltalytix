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
        <div className="min-h-screen bg-[#f7f7f4] text-[#26251e] [--background:60_16%_96.3%] [--card:48_16%_93.9%] [--foreground:53_12%_13.3%] dark:bg-[#14120b] dark:text-[#edecec] dark:[--background:47_29%_6.1%] dark:[--card:45_17%_9%] dark:[--foreground:0_3%_92.7%]">
          <Toaster />
          <Navbar />
          <div className="pt-14">{children}</div>
          <Footer />
        </div>
      </I18nProviderClient>
    </ThemeProvider>
  );
}
