import { BarChart3, Calendar, Database, Brain } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Image from "next/image"
import { useTheme } from "./context/theme-provider"
import { AnimatedBeamDemo } from "./ai-feature"

export default function DeltalytixDashboard() {
  const { theme } = useTheme()
  const features = [
    {
      title: "Data Import",
      icon: <Database className="h-5 w-5 text-muted-foreground" />,
      description: "Import data from various providers. Our platform uses AI mapping from CSV to support major brokers and trading platforms exports, allowing you to centralize all your trading information in one place.",
      stat: "20+ Data Providers",
      image: theme === "dark" ? "/field-mapping-dark.png" : "/field-mapping-light.jpeg"
    },
    {
      title: "Performance Visualization",
      icon: <BarChart3 className="h-5 w-5 text-muted-foreground" />,
      description: "Visualize your trading performance with interactive charts and graphs. Analyze patterns, identify strengths, and pinpoint areas for improvement.",
      stat: "Comprehensive Analytics",
      image: theme === "dark" ? "/charts-dark.png" : "/charts-light.png"
    },
    {
      title: "Daily Performance",
      icon: <Calendar className="h-5 w-5 text-muted-foreground" />,
      description: "Track your daily trading results with an intuitive calendar view. Quickly identify trends and patterns in your trading performance.",
      stat: "Calendar View",
      image: theme === "dark" ? "/calendar-dark.png" : "/calendar-light.png"
    },
    {
      title: "AI-Powered Journaling",
      icon: <Brain className="h-5 w-5 text-muted-foreground" />,
      description: "Improve your trading emotions with AI-assisted journaling. Our advanced algorithms analyze your entries to identify emotional patterns and biases.",
      stat: "Emotional Intelligence",
      image: <AnimatedBeamDemo />
    }
  ]

  return (
    <div className="p-4 bg-background text-foreground">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {features.map((feature, index) => (
          <Card key={index} className={`bg-card ${
            index < 2 ? 'lg:col-span-5' : 
            index === 2 ? 'lg:col-span-2' : 'lg:col-span-3'
          }`}>
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
                  {typeof feature.image === 'string' ? (
                    <Image
                      src={feature.image}
                    alt={`${feature.title} visualization`}
                    layout="fill"
                    objectFit="contain"
                    className="rounded-md"
                    />
                  ) : (
                    feature.image
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}