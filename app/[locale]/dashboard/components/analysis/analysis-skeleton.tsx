import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import { RefreshCw } from "lucide-react"
import { useI18n } from "@/locales/client"

interface AnalysisSkeletonProps {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
}

export function AnalysisSkeleton({ icon: Icon, title, description }: AnalysisSkeletonProps) {
  const t = useI18n()
  
  return (
    <Card className="relative overflow-hidden">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              <Icon className="h-5 w-5" />
              {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
            <Skeleton className="h-6 w-12" />
          </div>
        </div>
        <Progress value={0} className="w-full opacity-50" />
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Key Insights Skeleton */}
        <div className="space-y-3">
          <Skeleton className="h-4 w-20" />
          <div className="space-y-3">
            {[1, 2, 3].map((index) => (
              <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <Skeleton className="h-4 w-4 rounded-full shrink-0 mt-0.5" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-5 w-16" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendations Skeleton */}
        <div className="space-y-3">
          <Skeleton className="h-4 w-24" />
          <div className="space-y-2">
            {[1, 2, 3].map((index) => (
              <div key={index} className="flex items-start gap-2">
                <Skeleton className="w-2 h-2 rounded-full mt-2 shrink-0" />
                <Skeleton className="h-3 flex-1" />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
      
      {/* Loading overlay */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-xs flex items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin" />
          {t('analysis.loading')}
        </div>
      </div>
    </Card>
  )
} 