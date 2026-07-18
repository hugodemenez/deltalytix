import { Suspense } from "react";
import { connection } from "next/server";
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
import { BetaConnectionFlowInvite } from "@/components/beta-connection-flow-invite";
import { PostHogIdentity } from "@/components/posthog-identity";
import { createClient } from "@/server/auth";
import { resolveLocale } from "@/lib/locale-params";

async function DashboardPostHogIdentity({ locale }: { locale: string }) {
  // Request-time only — avoid running auth/bypass checks during prerender.
  await connection();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id || !user.email) return null;

  return (
    <PostHogIdentity userId={user.id} email={user.email} language={locale} />
  );
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const locale = await resolveLocale(params);

  return (
    <I18nProviderClient locale={locale}>
      <ConsentBanner />
      <Suspense fallback={null}>
        <DashboardPostHogIdentity locale={locale} />
      </Suspense>
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
                  <BetaConnectionFlowInvite />
                </DxFeedSyncContextProvider>
              </TradovateSyncContextProvider>
            </RithmicSyncContextProvider>
          </DataProvider>
        </ThemeProvider>
      </TooltipProvider>
    </I18nProviderClient>
  );
}
