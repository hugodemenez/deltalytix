import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/next"
import { AuthProvider } from "@/context/auth-provider";
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
  other: {
    'google': 'notranslate',
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
    <html lang="en" className="bg-background" translate="no">
      <head>
        {/* Prevent Google Translate */}
        <meta name="google" content="notranslate" />
        <meta name="googlebot" content="notranslate" />
        <meta name="googlebot-news" content="notranslate" />

        {/* Prevent Google Translate DOM manipulation */}
        <Script id="prevent-google-translate" strategy="beforeInteractive">
          {`
            // Function to prevent Google Translate from modifying the DOM
            function preventGoogleTranslate() {
              // Prevent Google Translate from modifying the DOM
              const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                  if (mutation.type === 'childList' && 
                      mutation.target.classList && 
                      mutation.target.classList.contains('goog-te-menu-frame')) {
                    // Prevent Google Translate from modifying our React components
                    const elements = document.querySelectorAll('[class*="goog-te-"]');
                    elements.forEach((el) => {
                      if (el.tagName === 'SPAN' && el.parentElement) {
                        // Preserve the original text content
                        const originalText = el.getAttribute('data-original-text') || el.textContent;
                        el.textContent = originalText;
                      }
                    });
                  }
                });
              });

              // Start observing the document with the configured parameters
              observer.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['class']
              });

              // Prevent Google Translate from initializing
              if (window.google && window.google.translate) {
                window.google.translate.TranslateElement = function() {
                  return {
                    translate: function() {
                      return false;
                    }
                  };
                };
              }
            }

            // Run the prevention function
            preventGoogleTranslate();
          `}
        </Script>


        {/* PostHog Analytics */}
        <Script id="posthog-analytics" strategy="afterInteractive">
          {`
            !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug getPageViewId".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
            posthog.init('phc_NS2VmvRg0gY0tMBpq3tMX3gOBQdG79VOciAh8NDWSeX', {
                api_host: 'https://eu.i.posthog.com',
                person_profiles: 'identified_only',
            })
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
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
