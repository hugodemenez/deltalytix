'use client'

import { useEffect } from "react";
import { redirect, useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";
import { createClient } from "@/server/auth";
import { I18nProviderClient } from "@/locales/client";

export default function RootLayout({
  children,
  params: { locale },
}: Readonly<{
  children: React.ReactNode;
  params: { locale: string };
}>) {
  
  const router = useRouter();
  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.slice(1)); // Remove the # and parse

    if (params.get('error')) {
      const errorDescription = params.get('error_description');
      toast({
        title: "Authentication Error",
        description: errorDescription?.replace(/\+/g, ' ') || "An error occurred during authentication",
        variant: "destructive",
      });

      // Clear the hash after showing the toast
      router.replace('/authentication');
    }
  }, [router]);

  return (
    <>
      <I18nProviderClient locale={locale}>{children}</I18nProviderClient>
    </>
  );
}