import { ThemeProvider } from "@/context/theme-provider";
import { DataProvider } from "@/context/data-provider";
import { Toaster } from "@/components/ui/sonner";
import { ReactNode } from "react";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {

  return (
      <ThemeProvider>
          <DataProvider isSharedView>
            <div className="min-h-screen flex flex-col bg-background">
              <Toaster />
              <div className="flex-1">
                {children}
              </div>
            </div>
          </DataProvider>
      </ThemeProvider>
  );
}