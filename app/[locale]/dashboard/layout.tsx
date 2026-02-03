import { ThemeProvider } from "@/context/theme-provider";
import { DataProvider } from "@/context/data-provider";
import Modals from "@/components/modals";
import Navbar from "./components/navbar";
import { RithmicSyncNotifications } from "./components/import/rithmic/sync/rithmic-notifications";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RithmicSyncContextProvider } from "@/context/rithmic-sync-context";
import { TradovateSyncContextProvider } from "@/context/tradovate-sync-context";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TooltipProvider>
      <ThemeProvider>
        <DataProvider>
          <RithmicSyncContextProvider>
            <TradovateSyncContextProvider>
              <RithmicSyncNotifications />
              <Toaster />
              <Navbar />
              {children}
              <Modals />
            </TradovateSyncContextProvider>
          </RithmicSyncContextProvider>
        </DataProvider>
      </ThemeProvider>
    </TooltipProvider>
  );
}
