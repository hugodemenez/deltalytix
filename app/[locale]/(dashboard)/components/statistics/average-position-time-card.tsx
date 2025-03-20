import { useUserData } from "@/components/context/user-data"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { WidgetSize } from '../../types/dashboard'
import { useI18n } from '@/locales/client'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { HelpCircle } from "lucide-react"

interface AveragePositionTimeCardProps {
  size?: WidgetSize
}

export default function AveragePositionTimeCard({ size = 'medium' }: AveragePositionTimeCardProps) {
  const { statistics: { averagePositionTime } } = useUserData()
  const  t  = useI18n()

    return (
      <Card className="h-full">
        <div className="flex items-center justify-center h-full gap-1.5">
          <Clock className="h-3 w-3 text-muted-foreground" />
          <div className="font-medium text-sm">{averagePositionTime}</div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                  <HelpCircle className="h-3 w-3 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent 
                side="bottom" 
                sideOffset={5} 
                className="bg-popover text-popover-foreground shadow-md rounded-md p-3 text-sm max-w-[300px] z-[9999]"
              >
                <p className="text-xs">{t('widgets.averagePositionTime.tooltip')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </Card>
    )
}