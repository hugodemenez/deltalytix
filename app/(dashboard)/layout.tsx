import { UserDataProvider } from "@/components/context/user-data";


export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
        <UserDataProvider>
          <div className="container mx-auto p-4 "> 
            {children}
          </div>
        </UserDataProvider>
  );
}
