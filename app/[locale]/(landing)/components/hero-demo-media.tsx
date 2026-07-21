"use client";

import { useTheme } from "@/context/theme-provider";
import { useEffect, useRef, useState } from "react";

const POSTER_SIZES =
  "(max-width: 640px) 100vw, (max-width: 1024px) 92vw, min(1280px, 90vw)";

const LIGHT_POSTER = {
  avif: "/videos/demo_white_poster-960.avif 960w, /videos/demo_white_poster-1440.avif 1440w, /videos/demo_white_poster-1920.avif 1920w",
  webp: "/videos/demo_white_poster-960.webp 960w, /videos/demo_white_poster-1440.webp 1440w, /videos/demo_white_poster-1920.webp 1920w",
  jpg: "/videos/demo_white_poster.jpg",
  width: 1920,
  height: 985,
} as const;

const DARK_POSTER = {
  avif: "/videos/demo_dark_poster-960.avif 960w, /videos/demo_dark_poster-1440.avif 1440w, /videos/demo_dark_poster-1920.avif 1920w",
  webp: "/videos/demo_dark_poster-960.webp 960w, /videos/demo_dark_poster-1440.webp 1440w, /videos/demo_dark_poster-1920.webp 1920w",
  jpg: "/videos/demo_dark_poster.jpg",
  width: 1920,
  height: 980,
} as const;

type HeroDemoMediaProps = {
  demoVideoLabel: string;
};

function PosterPicture({
  poster,
  className,
  loading,
}: {
  poster: typeof LIGHT_POSTER | typeof DARK_POSTER;
  className: string;
  loading?: "eager" | "lazy";
}) {
  return (
    <picture className={className}>
      <source type="image/avif" srcSet={poster.avif} sizes={POSTER_SIZES} />
      <source type="image/webp" srcSet={poster.webp} sizes={POSTER_SIZES} />
      <img
        src={poster.jpg}
        alt=""
        width={poster.width}
        height={poster.height}
        sizes={POSTER_SIZES}
        decoding="async"
        loading={loading}
        className="absolute inset-0 h-full w-full object-cover"
      />
    </picture>
  );
}

export default function HeroDemoMedia({ demoVideoLabel }: HeroDemoMediaProps) {
  const { theme, effectiveTheme } = useTheme();
  const [shouldLoadVideo, setShouldLoadVideo] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);

  // Read from the DOM class (set by the blocking init-theme script) so the
  // correct media is chosen before React state hydrates.
  const resolvedTheme =
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark")
      ? "dark"
      : effectiveTheme;

  const videoSrc =
    resolvedTheme === "dark"
      ? "/videos/demo_dark.mp4"
      : "/videos/demo_white.mp4";

  useEffect(() => {
    const container = videoContainerRef.current;
    if (!container) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const saveData =
      "connection" in navigator &&
      Boolean(
        (navigator as Navigator & { connection?: { saveData?: boolean } })
          .connection?.saveData,
      );
    // Mobile lab/field profiles are bandwidth-constrained; keep the optimized
    // poster as the permanent visual there instead of fetching a multi‑MB MP4.
    const preferPosterOnly = window.matchMedia("(max-width: 768px)").matches;

    // Keep the optimized poster as LCP; only upgrade to video after idle and
    // when the demo is near the viewport. Skip autoplay video when the user
    // prefers reduced motion, has data-saver enabled, or is on a narrow viewport.
    if (reduceMotion || saveData || preferPosterOnly) return;

    let idleId: number | undefined;
    let timeoutId: number | undefined;
    let observer: IntersectionObserver | undefined;

    const armObserver = () => {
      observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setShouldLoadVideo(true);
            observer?.disconnect();
          }
        },
        { rootMargin: "0px 0px", threshold: 0.15 },
      );
      observer.observe(container);
    };

    const schedule = () => {
      const ric = window.requestIdleCallback?.bind(window);
      if (ric) {
        idleId = ric(() => armObserver(), { timeout: 2500 });
      } else {
        timeoutId = window.setTimeout(armObserver, 1200);
      }
    };

    // Let LCP settle before competing with a multi‑MB MP4.
    timeoutId = window.setTimeout(schedule, 800);

    return () => {
      if (idleId !== undefined) window.cancelIdleCallback?.(idleId);
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      observer?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (shouldLoadVideo && videoRef.current) {
      videoRef.current.load();
    }
  }, [theme, effectiveTheme, shouldLoadVideo]);

  const handleVideoLoad = () => {
    setVideoLoaded(true);
  };

  const handleVideoError = () => {
    setVideoError(true);
  };

  const posterHidden = videoLoaded ? "opacity-0" : "opacity-100";

  return (
    <div
      ref={videoContainerRef}
      className="relative overflow-hidden rounded-md bg-[oklch(0.88_0.04_165)] p-2 sm:rounded-lg sm:p-5 lg:rounded-xl lg:p-8"
    >
      <div className="relative aspect-[2108/1080] w-full overflow-hidden rounded-sm bg-white shadow-2xl shadow-black/15 outline outline-1 outline-black/10 dark:aspect-[2120/1080] dark:bg-black dark:outline-white/10">
        {!videoError && (
          <>
            <PosterPicture
              poster={LIGHT_POSTER}
              loading="eager"
              className={`absolute inset-0 transition-opacity duration-300 dark:hidden ${posterHidden}`}
            />
            <PosterPicture
              poster={DARK_POSTER}
              loading="lazy"
              className={`absolute inset-0 hidden transition-opacity duration-300 dark:block ${posterHidden}`}
            />
          </>
        )}
        {videoError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-black">
            <p className="text-red-500">Failed to load video</p>
          </div>
        )}
        <video
          ref={videoRef}
          preload="none"
          loop
          muted
          autoPlay
          playsInline
          aria-label={demoVideoLabel}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${videoLoaded && !videoError ? "opacity-100" : "opacity-0"}`}
          onLoadedData={handleVideoLoad}
          onError={handleVideoError}
        >
          {shouldLoadVideo && <source src={videoSrc} type="video/mp4" />}
        </video>
      </div>
    </div>
  );
}
