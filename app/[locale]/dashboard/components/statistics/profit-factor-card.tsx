import { useData } from "@/context/data-provider"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Scale } from "lucide-react"
import { cn } from "@/lib/utils"
import { WidgetSize } from '../../types/dashboard'
import { useI18n } from '@/locales/client'
import { InfoBubble } from "@/components/ui/info-bubble"

interface ProfitFactorCardProps {
  size?: WidgetSize
}

export default function ProfitFactorCard({ size = 'medium' }: ProfitFactorCardProps) {
  const { statistics: { profitFactor } } = useData()
  const  t  = useI18n()

    return (
      <Card className="h-full">
        <div className="flex items-center justify-center h-full gap-1.5">
          <Scale className="h-3 w-3 text-blue-500" />
          <div className="font-medium text-sm tabular-nums">{profitFactor.toFixed(2)}</div>
          <InfoBubble
            icon="help"
            side="bottom"
            sideOffset={5}
            iconClassName="size-3"
            contentClassName="max-w-[300px]"
          >
            {t('widgets.profitFactor.tooltip')}
          </InfoBubble>
        </div>
      </Card>
    )
  }
