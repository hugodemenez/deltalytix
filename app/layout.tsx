import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/next"

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Deltalytix",
  description: "Next generation trading dashboard",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <html lang="en" className="h-screen w-screen">
      <body className={inter.className + " h-screen w-screen overflow-x-hidden"}>
        <SpeedInsights />
        <Analytics />
        <Toaster />
        {children}
      </body>
    </html>
  );
}
