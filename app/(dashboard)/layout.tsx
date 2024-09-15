import { ThemeProvider } from "@/components/context/theme-provider";
import { TradeDataProvider } from "@/components/context/trades-data";
import { UserDataProvider, useUser } from "@/components/context/user-data";
import FilterLeftPane from "@/components/filters/filter-left-pane";
import Navbar from "@/components/navbar";
import SubscriptionModal from "@/components/subscription-modal";
import { Separator } from "@/components/ui/separator";
import { Toaster } from "@/components/ui/toaster";
import { createClient } from "@/server/auth";
import { redirect } from "next/navigation";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  
  // Prevent unauthenticated users from accessing the dashboard part of the app
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/authentication')
  }
  return (
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
  );
}