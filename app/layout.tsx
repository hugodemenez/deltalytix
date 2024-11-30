import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/next"
import Script from "next/script"

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Deltalytix",
  description: "Next generation trading dashboard",
  metadataBase: new URL('https://deltalytix.app'), 
  openGraph: {
    title: "Deltalytix",
    description: "Deltalytix is a next generation trading dashboard that provides real-time insights and analytics for traders.",
    images: [
      {
        url: '/opengraph-image.png',
        width: 1200,
        height: 630,
        alt: 'Deltalytix Open Graph Image',
      },
      {
        url: '/twitter-image.png',
        width: 1200,
        height: 630,
        alt: 'Deltalytix Twitter Image',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Deltalytix",
    description: "Next generation trading dashboard",
    images: ['/twitter-image.png'],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-screen w-screen">
      <head>
        <Script 
          src="https://cdn.tolt.io/tolt.js" 
          data-tolt="954085db-aff4-4df2-bcc8-c71631304415"
          strategy="afterInteractive"
        />
      </head>
      <body className={inter.className + " h-screen w-screen overflow-x-hidden"}>
        <SpeedInsights />
        <Analytics />
        <Toaster />
        {children}
      </body>
    </html>
  );
}
