import { ThemeProvider } from "@/components/context/theme-provider";
import { UserDataProvider } from "@/components/context/user-data";
import Modals from "@/components/modals";
import { Toaster } from "@/components/ui/toaster";
import { ReactElement } from "react";
import { AI } from "@/components/ai";
import Navbar from "./components/navbar";
import { WebSocketProvider } from "@/components/context/rithmic-sync-context";
import { OnbordaProvider, Onborda } from 'onborda'
import { steps } from "./components/onboarding/onboarding-steps";
import { TourCard } from "./components/onboarding/custom-card";
import { WebSocketNotifications } from './components/import/rithmic/sync/rithmic-notifications'
import { MoodProvider } from '@/components/context/mood-data';
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { PrismaClient } from "@prisma/client";
import { createClient, ensureUserInDatabase } from "@/server/auth";

export default async function RootLayout(props: { params: Promise<{ locale: string }>, children: ReactElement }) {
  const params = await props.params;

  const {
    locale
  } = params;

  const {
    children
  } = props;

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  const prisma = new PrismaClient()

  if (user?.id) {
    try {
      // First ensure the user exists in the database using our existing function
      await ensureUserInDatabase(user)
      
      // Then update the language preference
      await prisma.user.update({
        where: { 
          auth_user_id: user.id
        },
        data: { 
          language: locale
        },
      })
    } catch (error) {
      console.error('Error syncing user data:', error)
      // Don't throw the error as this is not critical for the app to function
    } finally {
      await prisma.$disconnect()
    }
  }

  return (
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
  );
}