import { ThemeProvider } from "@/components/context/theme-provider";
import { TradeDataProvider } from "@/components/context/trades-data";
import { UserDataProvider } from "@/components/context/user-data";
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
          <div className="px-2 sm:px-6 lg:px-32">
            <Toaster />
            <Navbar />
            {children}
          </div>
        </TradeDataProvider>
      </UserDataProvider>
    </ThemeProvider>
  );
}
