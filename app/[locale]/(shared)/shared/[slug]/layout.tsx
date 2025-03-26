import { ThemeProvider } from "@/components/context/theme-provider";
import { UserDataProvider } from "@/components/context/user-data";
import { Toaster } from "@/components/ui/toaster";
import { ReactElement } from "react";
import { AI } from "@/components/ai";
import { MoodProvider } from '@/components/context/mood-data';

export default async function RootLayout(props: { params: Promise<{ locale: string }>, children: ReactElement }) {
  const params = await props.params;

  const {
    locale
  } = params;

  const {
    children
  } = props;

  return (
    <AI>
      <ThemeProvider>
        <MoodProvider>
          <UserDataProvider isSharedView>
            <div className="min-h-screen flex flex-col bg-background">
              <Toaster />
              <div className="flex-1">
                {children}
              </div>
            </div>
          </UserDataProvider>
        </MoodProvider>
      </ThemeProvider>
    </AI>
  );
}