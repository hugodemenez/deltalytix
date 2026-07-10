import type { CapacitorConfig } from "@capacitor/cli"

const productionUrl = "https://www.deltalytix.app/dashboard"
const localUrl = "http://127.0.0.1:3000/dashboard"

/**
 * Remote WebView shell — mirrors the desktop Native SDK approach:
 * load the hosted Next.js app instead of bundling static assets.
 *
 * Override for local dev:
 *   DELTALYTIX_IOS_URL=http://127.0.0.1:3000/dashboard bun run sync
 */
const serverUrl = process.env.DELTALYTIX_IOS_URL ?? productionUrl
const isLocalDev = serverUrl.startsWith("http://")

const config: CapacitorConfig = {
  appId: "app.deltalytix.mobile",
  appName: "Deltalytix",
  webDir: "www",
  server: {
    url: serverUrl,
    cleartext: isLocalDev,
    allowNavigation: [
      "www.deltalytix.app",
      "*.deltalytix.app",
      "127.0.0.1",
      "localhost",
      "*.supabase.co",
      "accounts.google.com",
      "checkout.stripe.com",
    ],
  },
  ios: {
    contentInset: "automatic",
    scrollEnabled: true,
    allowsLinkPreview: false,
    scheme: "Deltalytix",
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: "#09090b",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#09090b",
    },
  },
}

export default config
