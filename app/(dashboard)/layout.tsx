import { TradeDataProvider } from "@/components/context/trades-data";
import { UserDataProvider } from "@/components/context/user-data";
import Navbar from "@/components/navbar";


export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <UserDataProvider>
      <TradeDataProvider>
        <Navbar />
        {children}
      </TradeDataProvider>
    </UserDataProvider>
  );
}
