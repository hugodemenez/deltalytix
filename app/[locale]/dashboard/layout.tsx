import { ThemeProvider } from "@/context/theme-provider";
import { DataProvider } from "@/context/data-provider";
import Modals from "@/components/modals";
import { Toaster } from "@/components/ui/toaster";
import { ReactElement } from "react";
import Navbar from "./components/navbar";
import { WebSocketProvider } from "@/context/rithmic-sync-context";
import { WebSocketNotifications } from './components/import/rithmic/sync/rithmic-notifications'
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export default async function RootLayout(props: { params: Promise<{ locale: string }>, children: ReactElement }) {
  const {
    children
  } = props;

  return (
    <TooltipProvider>
      <ThemeProvider>
        <DataProvider>
            <WebSocketProvider>
              <WebSocketNotifications />
              <div className="min-h-screen flex flex-col">
                    <SonnerToaster/>
                    <Toaster />
                    <Navbar />
                    <div className="flex flex-1 px-2 sm:px-8">
                      {children}
                    </div>
                    <Modals />
              </div>
            </WebSocketProvider>
        </DataProvider>
      </ThemeProvider>
    </TooltipProvider>
  );
}