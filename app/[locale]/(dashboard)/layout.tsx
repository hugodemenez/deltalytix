import { ThemeProvider } from "@/components/context/theme-provider";
import { TradeDataProvider } from "@/components/context/trades-data";
import { UserDataProvider, useUser } from "@/components/context/user-data";
import FilterLeftPane from "@/components/filters/filter-left-pane";
import Modals from "@/components/modals";
import Navbar from "@/components/navbar";
import { Separator } from "@/components/ui/separator";
import { Toaster } from "@/components/ui/toaster";
import { I18nProviderClient } from "@/locales/client";
import { createClient } from "@/server/auth";
import { redirect } from "next/navigation";
import { ReactElement } from "react";

export default async function RootLayout({ params: { locale }, children }: { params: { locale: string }, children: ReactElement }) {

  // Prevent unauthenticated users from accessing the dashboard part of the app
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/authentication')
  }
  return (
    <I18nProviderClient locale={locale}>
      <ThemeProvider>
        <UserDataProvider>
          <TradeDataProvider>
            <div className="min-h-screen flex flex-col">
              <Toaster />
              <Navbar />
              <div className="flex flex-1 px-2 sm:px-8">
                {children}
              </div>
              <Modals />
            </div>
          </TradeDataProvider>
        </UserDataProvider>
      </ThemeProvider>
    </I18nProviderClient>
  );
}