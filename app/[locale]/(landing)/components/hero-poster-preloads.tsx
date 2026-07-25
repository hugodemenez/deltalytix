const HERO_POSTER_PRELOAD_SIZES =
  "(max-width: 640px) 100vw, (max-width: 1024px) 92vw, min(1280px, 90vw)";

/** Theme-aware LCP preloads for the homepage hero posters only. */
export default function HeroPosterPreloads() {
  return (
    <>
      <link
        rel="preload"
        as="image"
        type="image/avif"
        imageSrcSet="/videos/demo_white_poster-960.avif 960w, /videos/demo_white_poster-1440.avif 1440w, /videos/demo_white_poster-1920.avif 1920w"
        imageSizes={HERO_POSTER_PRELOAD_SIZES}
        media="(prefers-color-scheme: light)"
        fetchPriority="high"
      />
      <link
        rel="preload"
        as="image"
        type="image/avif"
        imageSrcSet="/videos/demo_dark_poster-960.avif 960w, /videos/demo_dark_poster-1440.avif 1440w, /videos/demo_dark_poster-1920.avif 1920w"
        imageSizes={HERO_POSTER_PRELOAD_SIZES}
        media="(prefers-color-scheme: dark)"
        fetchPriority="high"
      />
    </>
  );
}
