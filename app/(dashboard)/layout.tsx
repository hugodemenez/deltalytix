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
    <UserDataProvider>
      <TradeDataProvider>
        <div className="px-2 sm:px-12 lg:px-48">
        <Toaster />
        <Navbar />
        {children}
        </div>
      </TradeDataProvider>
    </UserDataProvider>
  );
}
