import type { Metadata } from "next";
import { Toaster } from "@/components/ui/toaster";
import { createClient } from "@/server/auth";
import Navbar from "@/components/navbar";
import { UserDataProvider } from "@/components/context/user-data";
import React from "react";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <>
      {children}
    </>
  );
}
