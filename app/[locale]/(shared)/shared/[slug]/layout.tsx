import { ThemeProvider } from "@/components/context/theme-provider";
import { UserDataProvider } from "@/components/context/user-data";
import { Toaster } from "@/components/ui/toaster";
import { I18nProviderClient } from "@/locales/client";
import { ReactElement } from "react";
import { AI } from "@/components/ai";
import { MoodProvider } from '@/components/context/mood-data';

export default async function RootLayout({ params: { locale }, children }: { params: { locale: string }, children: ReactElement }) {
  return (
    <I18nProviderClient locale={locale}>
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
    </I18nProviderClient>
  );
}