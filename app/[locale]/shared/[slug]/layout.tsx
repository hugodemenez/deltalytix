import { ThemeProvider } from "@/context/theme-provider";
import { DataProvider } from "@/context/data-provider";
import { Toaster } from "@/components/ui/toaster";
import { ReactElement } from "react";

export default async function RootLayout(props: { params: Promise<{ locale: string }>, children: ReactElement }) {
  const params = await props.params;

  const {
    locale
  } = params;

  const {
    children
  } = props;

  return (
      <ThemeProvider>
          <DataProvider isSharedView>
            <div className="min-h-screen flex flex-col bg-background">
              <Toaster />
              <div className="flex-1">
                {children}
              </div>
            </div>
          </DataProvider>
      </ThemeProvider>
  );
}