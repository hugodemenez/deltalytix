'use client'

import { useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { SidebarNav } from "./components/sidebar-nav";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeProvider } from "@/context/theme-provider";

export default function RootLayout(
  props: Readonly<{
    children: React.ReactNode;
  }>
) {
  
  const {
    children
  } = props;

  const router = useRouter();
  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.slice(1)); // Remove the # and parse

    if (params.get('error')) {
      const errorDescription = params.get('error_description');
      toast.error("Authentication Error", {
        description: errorDescription?.replace(/\+/g, ' ') || "An error occurred during authentication",
      });

      // Clear the hash after showing the toast
      router.replace('/authentication');
    }
  }, [router]);

  return (
    <ThemeProvider>
      <SidebarProvider defaultOpen>
        <div className="flex min-h-screen w-screen">
          <SidebarNav />
          <main className="flex-1 overflow-y-auto p-6">
              {children}
          </main>
        </div>
      </SidebarProvider>
    </ThemeProvider>
  );
}