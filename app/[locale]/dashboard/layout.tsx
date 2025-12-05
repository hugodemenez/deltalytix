import { ThemeProvider } from "@/context/theme-provider";
import { DataProvider } from "@/context/data-provider";
import Modals from "@/components/modals";
import Navbar from "./components/navbar";
import { SyncContextProvider } from "@/context/sync-context";
import { RithmicSyncNotifications } from './components/import/rithmic/sync/rithmic-notifications'
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <TooltipProvider>
      <ThemeProvider>
        <DataProvider>
            <SyncContextProvider>
              <RithmicSyncNotifications />
              <div className="min-h-screen flex flex-col">
                    <Toaster />
                    <Navbar />
                    <div className="flex flex-1 px-2 sm:px-8">
                      {children}
                    </div>
                    <Modals />
              </div>
            </SyncContextProvider>
        </DataProvider>
      </ThemeProvider>
    </TooltipProvider>
  );
}