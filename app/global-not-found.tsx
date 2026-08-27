import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AgentNotFoundResources } from "@/components/agent-not-found-resources";
import { NotFoundContent } from "@/components/not-found-content";
import { CANVAS_THEME_COLOR } from "@/lib/canvas-theme-color";
import { cn } from "@/lib/utils";

/**
 * 404 page for URLs that match no route at all.
 *
 * `app/[locale]/[...not-found]/page.tsx` used to catch these and call
 * `notFound()`. With Cache Components the catch-all route still has a
 * prerendered shell, so the shell was flushed with HTTP 200 before the
 * `notFound()` ran — a soft 404 that told agents every path exists.
 * `global-not-found` is resolved by the router before any layout or page
 * renders, so the response carries a real 404 status.
 *
 * It bypasses `app/layout.tsx`, so the document scaffolding (fonts, theme
 * bootstrap, base styles) is repeated here on purpose.
 */
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "404 — Page not found | Deltalytix",
  description:
    "The requested page does not exist. Browse the sitemap, llms.txt, or the API documentation index.",
  robots: { index: false, follow: true },
  alternates: {
    types: {
      "text/plain": "/llms.txt",
    },
  },
};

const INIT_THEME = `
  (function() {
    try {
      var root = document.documentElement;
      var savedTheme = localStorage.getItem('theme');
      var resolvedTheme = savedTheme === 'dark'
        ? 'dark'
        : savedTheme === 'light'
          ? 'light'
          : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

      root.classList.remove('light', 'dark');
      root.classList.add(resolvedTheme);

      var savedIntensity = localStorage.getItem('intensity');
      var intensity = savedIntensity ? Number(savedIntensity) : 100;
      root.style.setProperty('--theme-intensity', intensity + '%');
    } catch (e) {
      // Fail silently to avoid blocking render
    }
  })();
`;

export default function GlobalNotFound() {
  return (
    <html
      lang="en"
      className="canvas-bg"
      translate="no"
      suppressHydrationWarning
      style={{ ["--theme-intensity" as string]: "100%" }}
    >
      <head>
        <meta name="theme-color" content={CANVAS_THEME_COLOR.light} />
        <link rel="alternate" type="text/plain" href="/llms.txt" />
        <link rel="sitemap" type="application/xml" href="/sitemap.xml" />
        <script dangerouslySetInnerHTML={{ __html: INIT_THEME }} />
      </head>
      <body
        className={cn(
          inter.className,
          "canvas-bg antialiased [font-synthesis:none]",
        )}
      >
        <NotFoundContent />
        <div className="flex justify-center px-4 pb-16">
          <AgentNotFoundResources />
        </div>
      </body>
    </html>
  );
}
