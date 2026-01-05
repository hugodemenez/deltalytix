import { ThemeProvider } from "@/context/theme-provider";
import { DataProvider } from "@/context/data-provider";
import Modals from "@/components/modals";
import Navbar from "./components/navbar";
import { SyncContextProvider } from "@/context/sync-context";
import { RithmicSyncNotifications } from "./components/import/rithmic/sync/rithmic-notifications";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getDashboardInitialData } from "@/server/dashboard-initial-data";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side data prefetch for optimal TTFB and reduced DB egress
  // This data is cached per-user and invalidated on mutations
  const initialData = await getDashboardInitialData();

  return (
    <TooltipProvider>
      <ThemeProvider>
        <DataProvider initialData={initialData}>
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
