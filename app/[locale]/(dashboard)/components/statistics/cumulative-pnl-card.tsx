import { useUserData } from "@/components/context/user-data"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { PiggyBank, HelpCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { WidgetSize } from '../../types/dashboard'
import { useI18n } from '@/locales/client'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface CumulativePnlCardProps {
  size?: WidgetSize
}

export default function CumulativePnlCard({ size = 'medium' }: CumulativePnlCardProps) {
  const { statistics: { cumulativePnl, cumulativeFees } } = useUserData()
  const totalPnl = cumulativePnl - cumulativeFees
  const isPositive = totalPnl > 0
  const t = useI18n()

    return (
      <Card className="flex items-center justify-center h-full p-2">
        <div className="flex items-center gap-1.5">
          <PiggyBank className="h-4 w-4 text-muted-foreground" />
          <span className={cn(
            "font-semibold text-base",
            isPositive ? "text-green-500" : "text-red-500"
          )}>
            ${Math.abs(totalPnl).toFixed(2)}
          </span>
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
                <p className="text-xs">{t('widgets.cumulativePnl.tooltip')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </Card>
    )
  }
