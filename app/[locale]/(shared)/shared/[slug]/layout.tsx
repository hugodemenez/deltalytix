import { ThemeProvider } from "@/components/context/theme-provider";
import { TradeDataProvider } from "@/components/context/trades-data";
import { Toaster } from "@/components/ui/toaster";
import { I18nProviderClient } from "@/locales/client";
import { ReactElement } from "react";
import { AI } from "@/components/ai";
import { MoodProvider } from '@/components/context/mood-data';

export default async function RootLayout({ params: { locale }, children }: { params: { locale: string }, children: ReactElement }) {
  return (
    <I18nProviderClient locale={locale}>
      <AI>
        <ThemeProvider>
            <MoodProvider>
              <TradeDataProvider>
                  <div className="min-h-screen flex flex-col">
                        <Toaster />
                        <div className="flex flex-1 px-2 sm:px-8">
                          {children}
                        </div>
                  </div>
              </TradeDataProvider>
            </MoodProvider>
        </ThemeProvider>
      </AI>
    </I18nProviderClient>
  );
}