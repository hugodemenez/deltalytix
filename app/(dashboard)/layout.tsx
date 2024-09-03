import { UserDataProvider } from "@/components/context/user-data";
import Navbar from "@/components/navbar";


export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
        <UserDataProvider>
          <div className="container mx-auto p-4 "> 
            <Navbar/>
            {children}
          </div>
        </UserDataProvider>
  );
}
