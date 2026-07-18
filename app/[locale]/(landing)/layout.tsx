import { Toaster } from "@/components/ui/sonner";
import Navbar from "./components/navbar";
import Footer from "./components/footer";
import { ThemeProvider } from "@/context/theme-provider";
import { I18nProviderClient } from "@/locales/landing-client";
import { ConsentBanner } from "@/components/consent-banner";
import { cacheLife } from "next/cache";

import { Metadata } from "next";
import { getSiteMetadataCopy } from "@/lib/og/site-metadata";
import { getCachedLocale } from "@/lib/locale-params";

type Locale = "en" | "fr";
const TITLE_TEMPLATE = "%s | Deltalytix";

export async function generateMetadata(props: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  "use cache";
  cacheLife("max");

  const locale = (await getCachedLocale(props.params)) as Locale;
  const copy = getSiteMetadataCopy(locale);

  return {
    title: {
      absolute: copy.title,
      template: TITLE_TEMPLATE,
    },
    description: copy.description,
    openGraph: {
      title: copy.title,
      description: copy.description,
      locale: locale === "fr" ? "fr_FR" : "en_US",
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
  const locale = await getCachedLocale(params);

  return (
    <I18nProviderClient locale={locale}>
      <ConsentBanner />
      {/*
        Theme tokens wrap ThemeProvider so the shared Safari chrome sampler
        inherits the landing --background values (not the app shell defaults).
      */}
      <div className="min-h-dvh bg-[oklch(0.97_0_0)] text-[oklch(0.17_0_0)] [--background:0_0%_96.1%] [--card:0_0%_100%] [--foreground:0_0%_9%] dark:bg-[oklch(0.17_0_0)] dark:text-[oklch(0.93_0_0)] dark:[--background:0_0%_6.7%] dark:[--card:0_0%_0%] dark:[--foreground:0_0%_93%]">
        <ThemeProvider>
          <Toaster />
          <Navbar />
          <div className="pt-nav-content">{children}</div>
          <Footer />
        </ThemeProvider>
      </div>
    </I18nProviderClient>
  );
}
