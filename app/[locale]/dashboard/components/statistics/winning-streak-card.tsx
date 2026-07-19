import { useData } from "@/context/data-provider"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Award } from "lucide-react"
import { cn } from "@/lib/utils"
import { WidgetSize } from '../../types/dashboard'
import { useI18n } from '@/locales/client'
import { InfoBubble } from "@/components/ui/info-bubble"

interface WinningStreakCardProps {
  size?: WidgetSize
}

export default function WinningStreakCard({ size = 'medium' }: WinningStreakCardProps) {
  const { statistics: { winningStreak } } = useData()
  const  t  = useI18n()

    return (
      <Card className="h-full">
        <div className="flex items-center justify-center h-full gap-1.5">
          <Award className="h-3 w-3 text-yellow-500" />
          <div className="font-medium text-sm tabular-nums">{winningStreak}</div>
          <InfoBubble
            icon="help"
            side="bottom"
            sideOffset={5}
            iconClassName="size-3"
            contentClassName="max-w-[300px]"
          >
            {t('widgets.winningStreak.tooltip')}
          </InfoBubble>
        </div>
      </Card>
    )
  }
