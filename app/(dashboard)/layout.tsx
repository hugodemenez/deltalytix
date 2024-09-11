import { ThemeProvider } from "@/components/context/theme-provider";
import { TradeDataProvider } from "@/components/context/trades-data";
import { UserDataProvider } from "@/components/context/user-data";
import FilterLeftPane from "@/components/filters/filter-left-pane";
import Navbar from "@/components/navbar";
import { Toaster } from "@/components/ui/toaster";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ThemeProvider>
      <UserDataProvider>
        <TradeDataProvider>
          <div className="min-h-screen flex flex-col">
            <Toaster />
            <Navbar />
            <div className="flex flex-1">
              <FilterLeftPane />
              <main className="flex-1 overflow-x-hidden pl-0 sm:pl-64 ">
                <div className="px-2 sm:px-6 lg:px-32 py-4">
                  {children}
                </div>
              </main>
            </div>
          </div>
        </TradeDataProvider>
      </UserDataProvider>
    </ThemeProvider>
  );
}