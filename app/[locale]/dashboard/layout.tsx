import { ThemeProvider } from "@/context/theme-provider";
import { DataProvider } from "@/context/data-provider";
import Modals from "@/components/modals";
import Navbar from "./components/navbar";
import { RithmicSyncNotifications } from "./components/import/rithmic/sync/rithmic-notifications";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RithmicSyncContextProvider } from "@/context/rithmic-sync-context";
import { TradovateSyncContextProvider } from "@/context/tradovate-sync-context";
import { DxFeedSyncContextProvider } from "@/context/dxfeed-sync-context";
import { I18nProviderClient } from "@/locales/client";
import { ConsentBanner } from "@/components/consent-banner";

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <I18nProviderClient locale={locale}>
      <ConsentBanner />
      <TooltipProvider>
      <ThemeProvider>
        <DataProvider>
          <RithmicSyncContextProvider>
            <TradovateSyncContextProvider>
              <DxFeedSyncContextProvider>
                <RithmicSyncNotifications />
                <Toaster />
                <Navbar />
                {children}
                <Modals />
              </DxFeedSyncContextProvider>
            </TradovateSyncContextProvider>
          </RithmicSyncContextProvider>
        </DataProvider>
      </ThemeProvider>
      </TooltipProvider>
    </I18nProviderClient>
  );
}
