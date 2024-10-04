import { ThemeProvider } from "@/components/context/theme-provider";
import { TradeDataProvider } from "@/components/context/trades-data";
import { UserDataProvider, useUser } from "@/components/context/user-data";
import FilterLeftPane from "@/components/filters/filter-left-pane";
import Navbar from "@/components/navbar";
import SubscriptionModal from "@/components/subscription-modal";
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
              <div className="flex flex-1 px-8">
                {children}
              </div>
              <SubscriptionModal />
            </div>
          </TradeDataProvider>
        </UserDataProvider>
      </ThemeProvider>
    </I18nProviderClient>
  );
}