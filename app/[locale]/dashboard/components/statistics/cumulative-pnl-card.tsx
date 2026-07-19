import { useData } from "@/context/data-provider"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { PiggyBank } from "lucide-react"
import { cn } from "@/lib/utils"
import { WidgetSize } from '../../types/dashboard'
import { useI18n } from '@/locales/client'
import { InfoBubble } from "@/components/ui/info-bubble"

interface CumulativePnlCardProps {
  size?: WidgetSize
}

export default function CumulativePnlCard({ size = 'medium' }: CumulativePnlCardProps) {
  const { statistics: { cumulativePnl, cumulativeFees } } = useData()
  const totalPnl = cumulativePnl - cumulativeFees
  const isPositive = totalPnl > 0
  const t = useI18n()

    return (
      <Card className="flex items-center justify-center h-full p-2">
        <div className="flex items-center gap-1.5">
          <PiggyBank className="h-4 w-4 text-muted-foreground" />
          <span className={cn(
            "font-semibold text-base tabular-nums",
            isPositive ? "text-green-500" : "text-red-500"
          )}>
            ${Math.abs(totalPnl).toFixed(2)}
          </span>
          <InfoBubble
            icon="help"
            side="bottom"
            sideOffset={5}
            iconClassName="size-3"
            contentClassName="max-w-[300px]"
          >
            {t('widgets.cumulativePnl.tooltip')}
          </InfoBubble>
        </div>
      </Card>
    )
  }
