import { ThemeProvider } from "@/components/context/theme-provider";
import { UserDataProvider } from "@/components/context/user-data";
import Modals from "@/components/modals";
import { Toaster } from "@/components/ui/toaster";
import { I18nProviderClient } from "@/locales/client";
import { ReactElement } from "react";
import { AI } from "@/components/ai";
import Navbar from "./components/navbar";
import { WebSocketProvider } from "./components/context/websocket-context";
import { OnbordaProvider, Onborda } from 'onborda'
import { steps } from "./components/onboarding/onboarding-steps";
import { TourCard } from "./components/onboarding/custom-card";
import { WebSocketNotifications } from './components/websocket-notifications'
import { MoodProvider } from '@/components/context/mood-data';
import { Toaster as SonnerToaster } from "@/components/ui/sonner";

export default async function RootLayout({ params: { locale }, children }: { params: { locale: string }, children: ReactElement }) {
  return (
    <I18nProviderClient locale={locale}>
      <AI>
        <ThemeProvider>
          <UserDataProvider>
            <MoodProvider>
              <WebSocketProvider>
                <WebSocketNotifications />
                <div className="min-h-screen flex flex-col">
                    <OnbordaProvider>
                      <Onborda
                        steps={steps}
                        showOnborda={true}
                        shadowRgb="0,0,0"
                        shadowOpacity="0.8"
                        cardComponent={TourCard}
                        cardTransition={{ duration: 2, type: "tween" }}
                      >
                        <SonnerToaster/>
                        <Toaster />
                        <Navbar />
                        <div className="flex flex-1 px-2 sm:px-8">
                          {children}
                        </div>
                        <Modals />
                      </Onborda>
                    </OnbordaProvider>
                  </div>
                </WebSocketProvider>
              </MoodProvider>
            </UserDataProvider>
          </ThemeProvider>
      </AI>
    </I18nProviderClient>
  );
}