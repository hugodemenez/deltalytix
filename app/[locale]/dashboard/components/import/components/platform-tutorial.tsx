"use client";

import { ExternalLink } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { PlatformConfig } from "../config/platforms";
import { useI18n } from "@/locales/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface PlatformTutorialProps {
  selectedPlatform: PlatformConfig | undefined;
  setIsOpen: (isOpen: boolean) => void;
}

export function PlatformTutorial({
  selectedPlatform,
}: PlatformTutorialProps) {
  const t = useI18n();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [redirectOpen, setRedirectOpen] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.pause();
    video.currentTime = 0;

    if (selectedPlatform?.videoUrl) {
      video.load();
      const playVideo = () => {
        video.play().catch((error) => {
          console.error("Video playback error:", error);
        });
      };

      if (video.readyState >= 2) {
        playVideo();
      } else {
        video.addEventListener("loadeddata", playVideo, { once: true });
      }
    }

    return () => {
      if (video) {
        video.pause();
      }
    };
  }, [selectedPlatform]);

  if (!selectedPlatform) return null;

  const platformLabel = t(selectedPlatform.name as "import.type.csvAi.name");
  const hasVideo = Boolean(selectedPlatform.videoUrl);
  const hasDocs = Boolean(selectedPlatform.tutorialLink);

  const openDocs = () => {
    if (!selectedPlatform.tutorialLink) return;
    window.open(selectedPlatform.tutorialLink, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="min-w-0 space-y-2">
          <h2 className="text-xl font-normal tracking-tight md:text-2xl">
            {t("import.type.tutorial.open")}
          </h2>
          <p className="text-pretty text-sm leading-relaxed text-black/55 dark:text-white/55 md:text-base">
            {hasVideo
              ? t("import.type.tutorial.description", {
                  platform: platformLabel,
                })
              : hasDocs
                ? t("import.type.tutorial.redirectDescription", {
                    platform: platformLabel,
                  })
                : t("import.type.tutorial.notAvailable", {
                    platform: platformLabel,
                  })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {selectedPlatform.sampleFile && (
            <a
              href={selectedPlatform.sampleFile}
              download
              className="inline-flex h-10 items-center justify-center gap-2 rounded-sm border border-black/20 px-4 text-sm font-medium transition-[opacity,transform,background-color] duration-150 hover:bg-black/5 active:scale-[0.96] dark:border-white/20 dark:hover:bg-white/5"
            >
              {t("import.type.tutorial.downloadSample")}
            </a>
          )}
          {hasDocs && (
            <button
              type="button"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-sm border border-black/20 px-4 text-sm font-medium transition-[opacity,transform,background-color] duration-150 hover:bg-black/5 active:scale-[0.96] dark:border-white/20 dark:hover:bg-white/5"
              onClick={() => {
                if (hasVideo) {
                  openDocs();
                  return;
                }
                setRedirectOpen(true);
              }}
            >
              <ExternalLink className="h-4 w-4" strokeWidth={1.75} />
              {hasVideo
                ? t("import.type.tutorial.viewDocs")
                : t("import.type.tutorial.redirectConfirm")}
            </button>
          )}
        </div>
      </div>

      {hasVideo && (
        <div className="overflow-hidden rounded-sm bg-black/5 dark:bg-white/5">
          <div className="aspect-video">
            <video
              ref={videoRef}
              height="600"
              width="600"
              preload="metadata"
              loop
              muted
              controls
              playsInline
              className="h-full w-full object-cover"
            >
              <source src={selectedPlatform.videoUrl} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      )}

      {selectedPlatform.details && (
        <p className="border-t border-black/10 pt-4 text-sm leading-relaxed text-black/55 dark:border-white/10 dark:text-white/55">
          {t(selectedPlatform.details as keyof typeof t)}
        </p>
      )}

      {selectedPlatform.isRithmic && (
        <div className="space-y-2 border-t border-black/10 pt-4 text-xs leading-relaxed text-black/45 dark:border-white/10 dark:text-white/45">
          <div className="mb-2 flex flex-wrap items-center gap-4">
            <Image
              src="/RithmicArtwork/TradingPlatformByRithmic-Black.png"
              alt="Trading Platform by Rithmic"
              width={120}
              height={40}
              className="dark:hidden"
            />
            <Image
              src="/RithmicArtwork/TradingPlatformByRithmic-Green.png"
              alt="Trading Platform by Rithmic"
              width={120}
              height={40}
              className="hidden dark:block"
            />
            <Image
              src="/RithmicArtwork/Powered_by_Omne.png"
              alt="Powered by OMNE"
              width={120}
              height={40}
            />
          </div>
          <p>{t("import.type.copyright.platform")}</p>
          <p>{t("import.type.copyright.omne")}</p>
        </div>
      )}

      <AlertDialog open={redirectOpen} onOpenChange={setRedirectOpen}>
        <AlertDialogContent className="rounded-sm border-black/10 dark:border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-normal tracking-tight">
              {t("import.type.tutorial.redirectTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-black/55 dark:text-white/55">
              {t("import.type.tutorial.redirectDescription", {
                platform: platformLabel,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-sm">
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-sm"
              onClick={() => {
                openDocs();
                setRedirectOpen(false);
              }}
            >
              {t("import.type.tutorial.redirectConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
