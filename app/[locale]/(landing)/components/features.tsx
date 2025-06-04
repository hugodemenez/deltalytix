import { BarChart3, Calendar, Database, Brain } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Image from "next/image"
import { ImportFeature } from "./import-feature"
import { useI18n } from "@/locales/client"
import TradingChatAssistant from "./chat-feature"

export default function Features() {
  const t = useI18n()
  const features = [
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
      image: {
        light: "/charts-light.png",
        dark: "/charts-dark.png"
      }
    },
    {
      id: "daily-performance",
      title: t("landing.features.daily-performance.title"),
      icon: <Calendar className="h-5 w-5 text-muted-foreground" />,
      description: t("landing.features.daily-performance.description"),
      stat: t("landing.features.daily-performance.stat"),
      image: {
        light: "/calendar-light.png",
        dark: "/calendar-dark.png"
      }
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
                <div className="relative h-[300px] w-full flex justify-center items-center">
                  {typeof feature.image === 'object' && 'light' in feature.image ? (
                    <>
                      <Image
                        src={feature.image.light}
                        alt={`${feature.title} visualization`}
                        layout="fill"
                        objectFit="contain"
                        className="rounded-md dark:hidden"
                      />
                      <Image
                        src={feature.image.dark}
                        alt={`${feature.title} visualization`}
                        layout="fill"
                        objectFit="contain"
                        className="rounded-md hidden dark:block"
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