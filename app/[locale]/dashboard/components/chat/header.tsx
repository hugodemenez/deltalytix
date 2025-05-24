import { WidgetSize } from "../../types/dashboard"
import { CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { RotateCcw } from "lucide-react"
import { useI18n } from "@/locales/client"

export function ChatHeader({
    onReset,
    isLoading,
    size,
}: {
    title: string
    onReset: () => void
    isLoading: boolean
    size?: WidgetSize
}) {
    const t = useI18n();
    return (
        <CardHeader
            className={cn(
                "flex flex-row items-center justify-between space-y-0 border-b shrink-0",
                size === "small-long" ? "p-2 h-[40px]" : "p-3 sm:p-4 h-[56px]",
            )}
        >
            <div className="flex items-center gap-1.5">
                <CardTitle className={cn("line-clamp-1", size === "small-long" ? "text-sm" : "text-base")}>{t('chat.title')}</CardTitle>
            </div>
            <Button
                variant="ghost"
                size="icon"
                onClick={onReset}
                disabled={isLoading}
                className={cn("shrink-0", size === "small-long" ? "h-7 w-7" : "h-8 w-8")}
                title="Reset Chat"
            >
                <RotateCcw className={cn(size === "small-long" ? "h-3.5 w-3.5" : "h-4 w-4")} />
            </Button>
        </CardHeader>
    )
}