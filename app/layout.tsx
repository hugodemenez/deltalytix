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
  icons: {
    // Default icons
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.png', type: 'image/png', sizes: '32x32' },
    ],
    // Apple-specific icons
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    // Other platform icons
    other: [
      {
        rel: 'mask-icon',
        url: '/safari-pinned-tab.svg',
        color: '#000000'
      },
      {
        rel: 'android-chrome',
        sizes: '192x192',
        url: '/android-chrome-192x192.png',
      },
      {
        rel: 'android-chrome',
        sizes: '512x512',
        url: '/android-chrome-512x512.png',
      }
    ]
  },
  // Web manifest for PWA support
  manifest: '/site.webmanifest',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  authors: [{ name: 'Hugo DEMENEZ' }],
  creator: 'Hugo DEMENEZ',
  publisher: 'Hugo DEMENEZ',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-screen w-screen bg-background">
      <head>
        <link 
          rel="apple-touch-icon" 
          sizes="180x180" 
          href="/apple-touch-icon.png" 
        />
        <link 
          rel="apple-touch-icon-precomposed"
          sizes="180x180"
          href="/apple-touch-icon-precomposed.png"
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
