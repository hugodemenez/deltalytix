'use client'
import { useI18n } from "@/locales/landing-client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/context/theme-provider";
import { Play } from "lucide-react";

export default function Hero() {
  const t = useI18n();
  const { theme, effectiveTheme } = useTheme();
  const [shouldLoadVideo, setShouldLoadVideo] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const videoSrc =
    effectiveTheme === "dark"
      ? "/videos/demo_dark.mp4"
      : "/videos/demo_white.mp4";

  useEffect(() => {
    setVideoLoaded(false);
    setVideoError(false);

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
    <div className="container px-4 md:px-6 mx-auto">
      <div className="flex flex-col w-full gap-y-24">
        <div className="flex flex-col  justify-center space-y-4 text-center">
          <div className="space-y-2">
            <Link href="/updates">
              <Button
                variant="link"
                className="mx-auto sm:mb-8 box-border flex flex-row justify-center items-center px-4 py-2 h-[26px] bg-[#EAF6F5] dark:bg-[hsl(var(--chart-1)/0.1)] border border-[#BBE2DB] dark:border-[hsl(var(--chart-1)/0.3)] rounded-[26px] text-[10px] font-semibold leading-5 tracking-[0.35px] uppercase text-[rgba(36,36,36,0.8)] dark:text-[hsl(var(--chart-1)/0.8)]"
              >
                {t("landing.updates")}
              </Button>
            </Link>
            <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">
              {t("landing.title")}
            </h1>
            <p className="mx-auto max-w-[600px] text-gray-500 dark:text-gray-400 md:text-xl">
              {t("landing.description")}
            </p>
          </div>
          <div className="flex w-full justify-center">
            <Link
              href={"/dashboard"}
              className="flex justify-center items-center px-8 py-2.5 h-10 bg-[#2E9987] hover:bg-[#267a6d] dark:bg-[hsl(var(--chart-1))] dark:hover:bg-[hsl(var(--chart-1)/0.9)] shadow-[0_0_0_6px_rgba(50,169,151,0.1),0_0_0_2px_rgba(50,169,151,0.25),0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)] hover:shadow-[0_0_0_6px_rgba(50,169,151,0.2),0_0_0_2px_rgba(50,169,151,0.35),0_2px_4px_rgba(0,0,0,0.2),0_2px_3px_-1px_rgba(0,0,0,0.2)] dark:shadow-[0_0_0_6px_hsl(var(--chart-1)/0.1),0_0_0_2px_hsl(var(--chart-1)/0.25),0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_0_0_6px_hsl(var(--chart-1)/0.2),0_0_0_2px_hsl(var(--chart-1)/0.35),0_2px_4px_rgba(0,0,0,0.2),0_2px_3px_-1px_rgba(0,0,0,0.2)] rounded-xl transition-all duration-200"
            >
              <span className="font-medium text-sm text-white">
                {t("landing.cta")}
              </span>
            </Link>
          </div>
        </div>
        <div className="flex w-full items-center justify-center relative rounded-lg">
          <div className="relative w-full h-full">
            <span className="absolute inset-[-12px] md:inset-[-24px] bg-[rgba(50,169,151,0.15)] dark:bg-[hsl(var(--chart-1)/0.15)] rounded-[14.5867px] -z-10 animate-pulse"></span>
            <span className="absolute inset-[-4px] md:inset-[-8px] bg-[rgba(50,169,151,0.25)] dark:bg-[hsl(var(--chart-1)/0.25)] rounded-[14.5867px] -z-20 animate-pulse"></span>
            <span className="absolute inset-0 shadow-[0_9.1167px_13.675px_-2.735px_rgba(0,0,0,0.1),0_3.64667px_5.47px_-3.64667px_rgba(0,0,0,0.1)] md:shadow-[0_18.2333px_27.35px_-5.47px_rgba(0,0,0,0.1),0_7.29333px_10.94px_-7.29333px_rgba(0,0,0,0.1)] dark:shadow-[0_9.1167px_13.675px_-2.735px_hsl(var(--chart-1)/0.1),0_3.64667px_5.47px_-3.64667px_hsl(var(--chart-1)/0.1)] md:dark:shadow-[0_18.2333px_27.35px_-5.47px_hsl(var(--chart-1)/0.1),0_7.29333px_10.94px_-7.29333px_hsl(var(--chart-1)/0.1)] rounded-[14.5867px] -z-30"></span>
            {!shouldLoadVideo && !videoError && (
              <button
                type="button"
                onClick={() => setShouldLoadVideo(true)}
                className="group relative block w-full aspect-video rounded-[14.5867px] border-[1.82333px] border-[#E5E7EB] dark:border-gray-800 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2E9987] focus-visible:ring-offset-2"
                aria-label="Play product demo video"
              >
                <Image
                  src="/videos/demo_white_poster.png"
                  alt=""
                  fill
                  priority
                  sizes="(max-width: 768px) 100vw, 1152px"
                  className="object-cover dark:hidden"
                />
                <Image
                  src="/videos/demo_dark_poster.png"
                  alt=""
                  fill
                  priority
                  sizes="(max-width: 768px) 100vw, 1152px"
                  className="hidden object-cover dark:block"
                />
                <span className="absolute inset-0 flex items-center justify-center bg-black/10 transition-colors group-hover:bg-black/20 dark:bg-black/20 dark:group-hover:bg-black/30">
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-[#2E9987] shadow-lg transition-transform group-hover:scale-105 dark:bg-black/70 dark:text-[hsl(var(--chart-1))]">
                    <Play className="h-7 w-7 fill-current pl-1" aria-hidden />
                  </span>
                </span>
              </button>
            )}
            {videoError && (
              <div className="w-full aspect-video flex items-center justify-center bg-gray-100 dark:bg-black rounded-lg">
                <p className="text-red-500">Failed to load video</p>
              </div>
            )}
            {shouldLoadVideo && !videoError && (
              <video
                ref={videoRef}
                preload="none"
                loop
                muted
                autoPlay
                playsInline
                className={`w-full aspect-video rounded-[14.5867px] border-[1.82333px] border-[#E5E7EB] dark:border-gray-800 object-cover ${videoLoaded ? "block" : "hidden"}`}
                onLoadedData={handleVideoLoad}
                onError={handleVideoError}
              >
                <source src={videoSrc} type="video/mp4" />
              </video>
            )}
            {shouldLoadVideo && !videoLoaded && !videoError && (
              <div
                className="w-full aspect-video rounded-[14.5867px] border-[1.82333px] border-[#E5E7EB] dark:border-gray-800 bg-muted animate-pulse"
                aria-hidden
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
