"use client"

import { ReactNode } from "react"
import { BarChart3, Calendar, Database, Brain } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Image from "next/image"
import { ImportFeature } from "./import-feature"
import { useI18n } from "@/locales/client"
import TradingChatAssistant from "./chat-feature"
import { CalendarFeaturePreview } from "./calendar-preview"
import { cn } from "@/lib/utils"
import { PnlPerContractPreview } from "./pnl-per-contract-preview"

type FeatureCard = {
  id: string
  title: string
  icon: ReactNode
  description: string
  stat: string
  image: ReactNode | { light: string; dark: string }
  wrapperClass?: string
}

function isImagePair(
  image: FeatureCard["image"]
): image is { light: string; dark: string } {
  return (
    typeof image === "object" &&
    image !== null &&
    "light" in image &&
    "dark" in image
  )
}

export default function Features() {
  const t = useI18n()
  const features: FeatureCard[] = [
    {
      id: "ai-journaling",
      title: t("landing.features.ai-journaling.title"),
      icon: <Brain className="h-5 w-5 text-muted-foreground" />,
      description: t("landing.features.ai-journaling.description"),
      stat: t("landing.features.ai-journaling.stat"),
      image: <TradingChatAssistant />
    },
    {
      id: "performance-visualization",
      title: t("landing.features.performance-visualization.title"),
      icon: <BarChart3 className="h-5 w-5 text-muted-foreground" />,
      description: t("landing.features.performance-visualization.description"),
      stat: t("landing.features.performance-visualization.stat"),
      image: <PnlPerContractPreview />,
      wrapperClass: "min-h-[420px]"
    },
    {
      id: "daily-performance",
      title: t("landing.features.daily-performance.title"),
      icon: <Calendar className="h-5 w-5 text-muted-foreground" />,
      description: t("landing.features.daily-performance.description"),
      stat: t("landing.features.daily-performance.stat"),
      image: <CalendarFeaturePreview />,
      wrapperClass: "min-h-[420px] lg:min-h-[480px]"
    },
    {
      id: "data-import",
      title: t("landing.features.data-import.title"),
      icon: <Database className="h-5 w-5 text-muted-foreground" />,
      description: t("landing.features.data-import.description"),
      stat: t("landing.features.data-import.stat"),
      image: <ImportFeature />
    }
  ]

  return (
    <main className="container mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold text-center mb-4">{t("landing.features.heading")}</h1>
      <p className="text-xl text-center text-gray-600 mb-12">{t("landing.features.subheading")}</p>
      <div className="grid grid-cols-1 lg:grid-cols-6 gap-4">
        {features.map((feature, index) => (
          <Card 
            id={feature.id} 
            key={feature.id} 
            className={`bg-card ${
              index < 2 ? 'lg:col-span-3' : 
              index === 2 ? 'lg:col-span-4' : 'lg:col-span-2'
            }`}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-medium">{feature.title}</CardTitle>
              {feature.icon}
            </CardHeader>
            <CardContent>
              <div className="flex flex-col space-y-4">
                <div>
                  <div className="text-2xl font-bold">{feature.stat}</div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {feature.description}
                  </p>
                </div>
              <div
                className={cn(
                  "relative w-full flex justify-center items-center rounded-xl overflow-hidden",
                  feature.wrapperClass ?? "h-[300px]"
                )}
              >
                  {isImagePair(feature.image) ? (
                    <>
                      <Image
                        src={feature.image.light}
                        alt={`${feature.title} visualization`}
                        className="rounded-md dark:hidden h-full w-full object-contain"
                        width={800}
                        height={400}
                      />
                      <Image
                        src={feature.image.dark}
                        alt={`${feature.title} visualization`}
                        className="rounded-md hidden dark:block h-full w-full object-contain"
                        width={800}
                        height={400}
                      />
                    </>
                  ) : (
                    feature.image
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  )
}