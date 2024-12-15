import { ThemeProvider } from "@/components/context/theme-provider";
import { TradeDataProvider } from "@/components/context/trades-data";
import { UserDataProvider, useUser } from "@/components/context/user-data";
import Modals from "./components/modals";
import { Toaster } from "@/components/ui/toaster";
import { I18nProviderClient } from "@/locales/client";
import { ReactElement } from "react";
import { AI } from "./ai";
import Navbar from "./components/navbar";

export default async function RootLayout({ params: { locale }, children }: { params: { locale: string }, children: ReactElement }) {
  return (
    <I18nProviderClient locale={locale}>
      <AI>
        <ThemeProvider>
          <UserDataProvider>
            <TradeDataProvider>
            <div className="min-h-screen flex flex-col">
              <Toaster />
              <Navbar />
              <div className="flex flex-1 px-2 sm:px-8">
                {children}
              </div>
              <Modals />
            </div>
            </TradeDataProvider>
          </UserDataProvider>
        </ThemeProvider>
      </AI>
    </I18nProviderClient>
  );
}