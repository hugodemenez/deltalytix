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
              {children}
            </div>
          </div>
        </TradeDataProvider>
      </UserDataProvider>
    </ThemeProvider>
  );
}