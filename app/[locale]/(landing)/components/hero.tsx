"use client";
import { useCurrentLocale, useI18n } from "@/locales/landing-client";
import { localizeLandingHref } from "@/lib/landing-nav-paths";
import Link, { useLinkStatus } from "next/link";
import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useTheme } from "@/context/theme-provider";

function GetStartedLinkContent({ children }: { children: React.ReactNode }) {
  const { pending } = useLinkStatus();

  return (
    <span
      className="relative inline-flex items-center justify-center text-sm font-medium"
      aria-busy={pending}
    >
      <span className={pending ? "invisible" : undefined}>{children}</span>
      {pending && (
        <>
          <Loader2 className="absolute h-4 w-4 animate-spin" aria-hidden />
          <span className="sr-only">Loading…</span>
        </>
      )}
    </span>
  );
}

export default function Hero() {
  const t = useI18n();
  const locale = useCurrentLocale();
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

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoadVideo(true);
          observer.disconnect();
        }
      },
      { rootMargin: "400px 0px", threshold: 0 },
    );

    observer.observe(container);
    return () => observer.disconnect();
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

  return (
    <div className="mx-auto w-full max-w-[1440px] px-5 pb-5 pt-16 sm:px-8 sm:pb-8 sm:pt-24 lg:px-12 lg:pt-32">
      <div className="flex flex-col gap-14 md:gap-20">
        <div className="max-w-[900px]">
          <Link
            href={localizeLandingHref(locale, "/updates")}
            className="mb-7 inline-flex text-sm text-black/55 transition-colors hover:text-black dark:text-white/55 dark:hover:text-white"
          >
            {t("landing.updates")}
          </Link>
          <div>
            <h1 className="max-w-[880px] text-[clamp(3rem,7.2vw,7.25rem)] font-normal leading-[0.92] tracking-[-0.06em]">
              {t("landing.title")}
            </h1>
            <p className="mt-7 max-w-[660px] text-lg leading-relaxed text-black/60 dark:text-white/60 md:text-xl">
              {t("landing.description")}
            </p>
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href={"/dashboard"}
              className="inline-flex h-12 items-center justify-center rounded-sm bg-[#26251e] px-6 text-sm font-medium text-white transition-opacity hover:opacity-85 dark:bg-[#f2f1eb] dark:text-[#11110f]"
            >
              <GetStartedLinkContent>{t("landing.cta")}</GetStartedLinkContent>
              <span className="ml-3">→</span>
            </Link>
            <Link
              href="#features"
              className="inline-flex h-12 items-center justify-center rounded-sm border border-black/20 px-6 text-sm font-medium transition-colors hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/5"
            >
              {t("landing.features.heading")} <span className="ml-3">↓</span>
            </Link>
          </div>
        </div>
        <div
          ref={videoContainerRef}
          className="relative overflow-hidden rounded-sm bg-[#c6ddd6] p-2 sm:p-5 lg:p-8"
        >
          <div className="relative aspect-[2108/1080] w-full overflow-hidden rounded-sm border border-black/15 bg-white shadow-2xl shadow-black/15 dark:aspect-[2120/1080] dark:bg-black">
            {!videoError && (
              <>
                <img
                  src="/videos/demo_white_poster.png"
                  alt=""
                  aria-hidden={videoLoaded}
                  className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 dark:hidden ${videoLoaded ? "opacity-0" : "opacity-100"}`}
                />
                <img
                  src="/videos/demo_dark_poster.png"
                  alt=""
                  aria-hidden={videoLoaded}
                  className={`absolute inset-0 hidden h-full w-full object-cover transition-opacity duration-300 dark:block ${videoLoaded ? "opacity-0" : "opacity-100"}`}
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
              aria-label={t("landing.demoVideo")}
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${videoLoaded && !videoError ? "opacity-100" : "opacity-0"}`}
              onLoadedData={handleVideoLoad}
              onError={handleVideoError}
            >
              {shouldLoadVideo && <source src={videoSrc} type="video/mp4" />}
            </video>
          </div>
        </div>
      </div>
    </div>
  );
}
