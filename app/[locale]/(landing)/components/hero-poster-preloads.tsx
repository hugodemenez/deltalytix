import Script from "next/script";

const HERO_POSTER_PRELOAD_SIZES =
  "(max-width: 640px) 100vw, (max-width: 1024px) 92vw, min(1280px, 90vw)";

const LIGHT_POSTER_SRCSET =
  "/videos/demo_white_poster-960.avif 960w, /videos/demo_white_poster-1440.avif 1440w, /videos/demo_white_poster-1920.avif 1920w";

const DARK_POSTER_SRCSET =
  "/videos/demo_dark_poster-960.avif 960w, /videos/demo_dark_poster-1440.avif 1440w, /videos/demo_dark_poster-1920.avif 1920w";

/** Theme-aware LCP preloads for the homepage hero posters only. */
export default function HeroPosterPreloads() {
  return (
    <Script id="hero-poster-preload" strategy="beforeInteractive">
      {`
        (function() {
          try {
            var savedTheme = localStorage.getItem('theme');
            var resolvedTheme = savedTheme === 'dark'
              ? 'dark'
              : savedTheme === 'light'
                ? 'light'
                : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
            var srcSet = resolvedTheme === 'dark'
              ? ${JSON.stringify(DARK_POSTER_SRCSET)}
              : ${JSON.stringify(LIGHT_POSTER_SRCSET)};
            var link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'image';
            link.type = 'image/avif';
            link.setAttribute('imagesrcset', srcSet);
            link.setAttribute('imagesizes', ${JSON.stringify(HERO_POSTER_PRELOAD_SIZES)});
            link.fetchPriority = 'high';
            document.head.appendChild(link);
          } catch (e) {
            // Fail silently to avoid blocking render
          }
        })();
      `}
    </Script>
  );
}
