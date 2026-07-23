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
import { ConsentBanner } from "@/components/consent-banner";
import { BetaConnectionFlowInvite } from "@/components/beta-connection-flow-invite";
import { PostHogIdentity } from "@/components/posthog-identity";
import { createClient } from "@/server/auth";
import { resolveLocale } from "@/lib/locale-params";

/**
 * Locale + auth for PostHog only — keep URL data inside Suspense so the
 * dashboard App Shell stays reusable for Instant Navigations.
 * Parent `[locale]/layout` already provides `I18nProviderClient`.
 */
async function DashboardPostHogIdentity({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  // Request-time only — avoid running auth/bypass checks during prerender.
  await connection();

  const locale = await resolveLocale(params);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id || !user.email) return null;

  return (
    <PostHogIdentity userId={user.id} email={user.email} language={locale} />
  );
}

export default function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  // Do not await `params` here — Instant Navigations needs a shared App Shell.
  // Locale i18n comes from `app/[locale]/layout.tsx`; only PostHog needs locale
  // and that read stays behind Suspense.
  return (
    <>
      <ConsentBanner />
      <Suspense fallback={null}>
        <DashboardPostHogIdentity params={params} />
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
    </>
  );
}
