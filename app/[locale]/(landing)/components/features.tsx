"use client";

import { ReactNode } from "react";
import { BarChart3, Calendar, Database, Brain } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import { ImportFeature } from "./import-feature";
import { useI18n } from "@/locales/landing-client";
import TradingChatAssistant from "./chat-feature";
import { CalendarFeaturePreview } from "./calendar-preview";
import { cn } from "@/lib/utils";
import { PnlPerContractPreview } from "./pnl-per-contract-preview";

type FeatureCard = {
  id: string;
  title: string;
  icon: ReactNode;
  description: string;
  stat: string;
  image: ReactNode | { light: string; dark: string };
  wrapperClass?: string;
};

function isImagePair(
  image: FeatureCard["image"],
): image is { light: string; dark: string } {
  return (
    typeof image === "object" &&
    image !== null &&
    "light" in image &&
    "dark" in image
  );
}

export default function Features() {
  const t = useI18n();
  const features: FeatureCard[] = [
    {
      id: "ai-journaling",
      title: t("landing.features.ai-journaling.title"),
      icon: <Brain className="h-5 w-5 text-muted-foreground" />,
      description: t("landing.features.ai-journaling.description"),
      stat: t("landing.features.ai-journaling.stat"),
      image: <TradingChatAssistant />,
      wrapperClass: "h-[420px] sm:h-[440px]",
    },
    {
      id: "performance-visualization",
      title: t("landing.features.performance-visualization.title"),
      icon: <BarChart3 className="h-5 w-5 text-muted-foreground" />,
      description: t("landing.features.performance-visualization.description"),
      stat: t("landing.features.performance-visualization.stat"),
      image: <PnlPerContractPreview />,
      wrapperClass: "min-h-[420px]",
    },
    {
      id: "daily-performance",
      title: t("landing.features.daily-performance.title"),
      icon: <Calendar className="h-5 w-5 text-muted-foreground" />,
      description: t("landing.features.daily-performance.description"),
      stat: t("landing.features.daily-performance.stat"),
      image: <CalendarFeaturePreview />,
      wrapperClass: "h-[420px] lg:h-[480px]",
    },
    {
      id: "data-import",
      title: t("landing.features.data-import.title"),
      icon: <Database className="h-5 w-5 text-muted-foreground" />,
      description: t("landing.features.data-import.description"),
      stat: t("landing.features.data-import.stat"),
      image: <ImportFeature />,
    },
  ];

  return (
    <div className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 md:py-28 lg:px-12">
      <div className="mb-16 grid gap-5 md:grid-cols-2 md:items-end">
        <h2 className="text-4xl font-normal tracking-[-0.04em] md:text-6xl">
          {t("landing.features.heading")}
        </h2>
        <p className="max-w-lg text-lg text-black/55 dark:text-white/55 md:justify-self-end">
          {t("landing.features.subheading")}
        </p>
      </div>
      <div className="divide-y divide-black/10 border-y border-black/10 dark:divide-white/10 dark:border-white/10">
        {features.map((feature, index) => (
          <Card
            id={feature.id}
            key={feature.id}
            className="grid w-full min-w-0 max-w-full gap-8 rounded-none border-0 bg-transparent py-10 shadow-none md:grid-cols-[minmax(240px,0.75fr)_minmax(0,1.5fr)] md:py-16"
          >
            <CardHeader className="flex min-w-0 flex-col items-start space-y-0 p-0">
              <div className="mb-8 flex w-full items-center justify-between">
                <span className="text-xs tabular-nums text-black/45 dark:text-white/45">
                  0{index + 1}
                </span>
                {feature.icon}
              </div>
              <CardTitle className="text-2xl font-normal tracking-tight md:text-3xl">
                {feature.title}
              </CardTitle>
              <div className="mt-5 text-sm font-medium">{feature.stat}</div>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-black/55 dark:text-white/55">
                {feature.description}
              </p>
            </CardHeader>
            <CardContent className="min-w-0 p-0">
              <div
                className={cn(
                  "relative flex w-full min-w-0 max-w-full items-center justify-center overflow-hidden rounded-sm bg-white dark:bg-black",
                  feature.wrapperClass ?? "h-[300px]",
                )}
              >
                {isImagePair(feature.image) ? (
                  <>
                    <Image
                      src={feature.image.light}
                      alt={`${feature.title} visualization`}
                      className="h-full w-full rounded-md object-contain dark:hidden"
                      width={800}
                      height={400}
                    />
                    <Image
                      src={feature.image.dark}
                      alt={`${feature.title} visualization`}
                      className="hidden h-full w-full rounded-md object-contain dark:block"
                      width={800}
                      height={400}
                    />
                  </>
                ) : (
                  feature.image
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
