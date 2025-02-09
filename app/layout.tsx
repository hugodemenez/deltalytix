import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/next"
import { AuthProvider } from "@/components/providers/auth-provider";
import { ConsentBanner } from "@/components/consent-banner";
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
  other:{
    'google':'notranslate',
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
    <html lang="en" className="bg-background">
      <head>
        {/* Google Tag Manager - Initial consent mode setup */}
        <Script id="google-consent-mode" strategy="beforeInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            
            // Enable URL passthrough
            gtag('set', 'url_passthrough', true);

            // Enable ads data redaction when ad_storage is denied
            gtag('set', 'ads_data_redaction', true);
            
            // Default consent settings with region-specific behavior
            gtag("consent", "default", {
              'ad_storage': 'denied',
              'ad_user_data': 'denied',          // New in consent mode v2
              'ad_personalization': 'denied',     // New in consent mode v2
              'analytics_storage': 'denied',
              'functionality_storage': 'granted',
              'personalization_storage': 'denied',
              'security_storage': 'granted',
              'wait_for_update': 500            // Wait for CMP to load
            });
          `}
        </Script>

        {/* Google Tag Manager - Main script */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=AW-16864609071"
          strategy="afterInteractive"
        />
        
        {/* Google Tag Manager - Configuration */}
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            // Configure with privacy settings
            gtag('config', 'AW-16864609071', {
              page_path: window.location.pathname,
              restricted_data_processing: true,    // Enable restricted data processing
              allow_google_signals: false,         // Disable Google signals by default
            });
          `}
        </Script>

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
        <style>
          {`
            /* Base layout */
            html {
              margin: 0;
              padding: 0;
              overflow-y: scroll !important;
              overflow-x: hidden !important;
              scrollbar-gutter: stable !important;
              -ms-overflow-style: scrollbar !important;
            }

            body {
              min-height: 100vh !important;
              margin: 0 !important;
              padding: 0 !important;
              overflow-x: hidden !important;
            }

            /* Style the scrollbar */
            ::-webkit-scrollbar {
              width: 14px !important;
              background-color: transparent !important;
            }

            ::-webkit-scrollbar-track {
              background: hsl(var(--background)) !important;
              border-left: 1px solid hsl(var(--border)) !important;
            }

            ::-webkit-scrollbar-thumb {
              background: hsl(var(--muted-foreground) / 0.3) !important;
              border-radius: 7px !important;
              border: 3px solid hsl(var(--background)) !important;
              min-height: 40px !important;
            }

            ::-webkit-scrollbar-thumb:hover {
              background: hsl(var(--muted-foreground) / 0.4) !important;
            }

            /* Firefox scrollbar styles */
            * {
              scrollbar-width: thin !important;
              scrollbar-color: hsl(var(--muted-foreground) / 0.3) transparent !important;
            }
          `}
        </style>
      </head>
      <body className={inter.className + " min-h-screen overflow-x-hidden w-screen"}>
        <AuthProvider>
          <SpeedInsights />
          <Analytics />
          <Toaster />
          <ConsentBanner />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
