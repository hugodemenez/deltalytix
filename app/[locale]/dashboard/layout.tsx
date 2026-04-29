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
import { GamificationProvider } from "./components/gamification-provider";
import { getCurrentUser } from "@/lib/auth";
import { touchStreak } from "@/server/gamification/actions";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Touch streak on every authenticated dashboard load
  const user = await getCurrentUser();
  if (user) {
    // fire-and-forget — don't block render
    touchStreak(user.id).catch(console.error);
  }

  return (
    <TooltipProvider>
      <ThemeProvider>
        <DataProvider>
          <RithmicSyncContextProvider>
            <TradovateSyncContextProvider>
              <DxFeedSyncContextProvider>
                <RithmicSyncNotifications />
                <Toaster />
                <Navbar />
                <GamificationProvider>
                  {children}
                </GamificationProvider>
                <Modals />
              </DxFeedSyncContextProvider>
            </TradovateSyncContextProvider>
          </RithmicSyncContextProvider>
        </DataProvider>
      </ThemeProvider>
    </TooltipProvider>
  );
}
