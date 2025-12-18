import { ThemeProvider } from "@/context/theme-provider";
import { DataProvider } from "@/context/data-provider";
import Modals from "@/components/modals";
import Navbar from "./components/navbar";
import { SyncContextProvider } from "@/context/sync-context";
import { RithmicSyncNotifications } from "./components/import/rithmic/sync/rithmic-notifications";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TooltipProvider>
      <ThemeProvider>
        <DataProvider>
          <SyncContextProvider>
            <RithmicSyncNotifications />
            <Toaster />
            <Navbar />
            {children}
            <Modals />
          </SyncContextProvider>
        </DataProvider>
      </ThemeProvider>
    </TooltipProvider>
  );
}
