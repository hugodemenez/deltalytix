import { WidgetSize } from "../../types/dashboard"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { RotateCcw } from "lucide-react"
import { useI18n } from "@/locales/client"
import { WidgetHeader, isCompactSize } from "../widgets"

export function ChatHeader({
    onReset,
    isLoading,
    size = "medium",
}: {
    title: string
    onReset: () => void
    isLoading: boolean
    size?: WidgetSize
}) {
    const t = useI18n();
    const compact = isCompactSize(size)
    return (
        <WidgetHeader
            size={size}
            title={t('chat.title')}
            actions={
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onReset}
                    disabled={isLoading}
                    className={cn("shrink-0", compact ? "h-7 w-7" : "h-8 w-8")}
                    aria-label={t('chat.resetConversation')}
                >
                    <RotateCcw className={cn(compact ? "h-3.5 w-3.5" : "h-4 w-4")} />
                </Button>
            }
        />
    )
}
