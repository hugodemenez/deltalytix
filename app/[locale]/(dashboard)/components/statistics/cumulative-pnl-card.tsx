import { useTradeStatistics } from "@/components/context/trades-data"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { PiggyBank } from "lucide-react"
import { cn } from "@/lib/utils"

interface CumulativePnlCardProps {
  size?: 'tiny' | 'small' | 'medium' | 'large' | 'small-long'
}

export default function CumulativePnlCard({ size = 'medium' }: CumulativePnlCardProps) {
  const { statistics: { cumulativePnl, cumulativeFees } } = useTradeStatistics()
  const totalPnl = cumulativePnl - cumulativeFees
  const isPositive = totalPnl > 0

  if (size === 'tiny') {
    return (
      <Card className="flex items-center justify-center h-full p-2">
        <PiggyBank className="h-4 w-4 text-muted-foreground mr-2" />
        <span className={cn(
          "font-semibold text-base",
          isPositive ? "text-green-500" : "text-red-500"
        )}>
          ${Math.abs(totalPnl).toFixed(2)}
        </span>
      </Card>
    )
  }

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
          Cumulative PnL
        </CardTitle>
        <PiggyBank className={cn(
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
          (size === 'small' || size === 'small-long') ? "text-lg" : "text-2xl",
          isPositive ? "text-green-500" : "text-red-500"
        )}>
          ${Math.abs(totalPnl).toFixed(2)}
        </div>
      </CardContent>
    </Card>
  )
}