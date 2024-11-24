import { useTradeStatistics } from "@/components/context/trades-data"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Clock } from "lucide-react"
import { cn } from "@/lib/utils"

interface AveragePositionTimeCardProps {
  size?: 'small' | 'medium' | 'large' | 'small-long'
}

export default function AveragePositionTimeCard({ size = 'medium' }: AveragePositionTimeCardProps) {
  const { statistics: { averagePositionTime } } = useTradeStatistics()

  return (
    <Card className="h-full">
      <CardHeader 
        className={cn(
          "flex flex-row items-center justify-between space-y-0",
          (size === 'small' || size === 'small-long')
            ? "p-2" 
            : "p-4 sm:p-6"
        )}
      >
        <CardTitle 
          className={cn(
            "line-clamp-1",
            (size === 'small' || size === 'small-long') ? "text-sm" : "text-base sm:text-lg"
          )}
        >
          Average Position Time
        </CardTitle>
        <Clock className={cn(
          "text-muted-foreground",
          (size === 'small' || size === 'small-long') ? "h-4 w-4" : "h-5 w-5"
        )} />
      </CardHeader>
      <CardContent 
        className={cn(
          (size === 'small' || size === 'small-long') ? "p-2" : "p-4 sm:p-6"
        )}
      >
        <div className={cn(
          "font-bold",
          (size === 'small' || size === 'small-long') ? "text-lg" : "text-2xl"
        )}>
          {averagePositionTime}
        </div>
      </CardContent>
    </Card>
  )
}