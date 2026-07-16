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
import { PostHogIdentity } from "@/components/posthog-identity";
import { createClient } from "@/server/auth";

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <I18nProviderClient locale={locale}>
      <ConsentBanner />
      {user?.id && user.email && (
        <PostHogIdentity userId={user.id} email={user.email} language={locale} />
      )}
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
