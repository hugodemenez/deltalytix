import { ThemeProvider } from "@/context/theme-provider";
import { DataProvider } from "@/context/data-provider";
import Modals from "@/components/modals";
import { Toaster } from "@/components/ui/toaster";
import { ReactElement } from "react";
import Navbar from "./components/navbar";
import { WebSocketProvider } from "@/context/rithmic-sync-context";
import { OnbordaProvider, Onborda } from 'onborda'
import { steps } from "./components/onboarding/onboarding-steps";
import { TourCard } from "./components/onboarding/custom-card";
import { WebSocketNotifications } from './components/import/rithmic/sync/rithmic-notifications'
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
      <ThemeProvider>
        <DataProvider>
            <WebSocketProvider>
              <WebSocketNotifications />
              <div className="min-h-screen flex flex-col">
                    <SonnerToaster/>
                    <Toaster />
                    <Navbar />
                    <div className="flex flex-1 px-2 sm:px-8">
                      {children}
                    </div>
                    <Modals />
              </div>
            </WebSocketProvider>
        </DataProvider>
      </ThemeProvider>
  );
}