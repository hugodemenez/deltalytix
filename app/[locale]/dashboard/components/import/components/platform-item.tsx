'use client'

import { Badge } from "@/components/ui/badge"
import { CommandItem } from "@/components/ui/command"
import { cn } from "@/lib/utils"
import { AlertTriangle, ChevronRight } from "lucide-react"
import { ThemeAwareLogo } from "@/components/monochrome-logo"
import { RithmicWeekendWarning } from "@/components/rithmic-weekend-warning"
import { isLocalWeekend } from "@/lib/rithmic-weekend"
import { PlatformConfig } from "../config/platforms"
import { useI18n } from "@/locales/client"

interface PlatformItemProps {
  platform: PlatformConfig
  isSelected: boolean
  onSelect: (type: string) => void
  onHover: (category: string) => void
  onLeave: () => void
  showNavigateHint?: boolean
}

export function PlatformItem({
  platform,
  isSelected,
  onSelect,
  onHover,
  onLeave,
  showNavigateHint = false,
}: PlatformItemProps) {
  const t = useI18n()
  const showWeekendWarning =
    !platform.isDisabled && !!platform.isRithmic && isLocalWeekend()

  return (
    <div className={cn(
      (platform.isDisabled || platform.isComingSoon) && "cursor-not-allowed"
    )}>
      <CommandItem
        defaultChecked={false}
        aria-selected={isSelected}
        onSelect={() => !platform.isDisabled && onSelect(platform.type)}
        onMouseEnter={() => onHover(platform.category)}
        onMouseLeave={onLeave}
        className={cn(
          "data-[selected='true']:bg-transparent",
          "flex items-stretch gap-3 sm:gap-4 ml-6 border-l-2 border-muted pl-4 transition-all duration-200 rounded-none",
          platform.isDisabled && "opacity-50 select-none",
          !platform.isDisabled && "cursor-pointer",
          isSelected && "border-l-primary bg-primary/5",
          !platform.isDisabled && "hover:border-l-primary/50"
        )}
        disabled={platform.isDisabled || platform.isComingSoon}
      >
        <div className="flex items-center py-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border/50 bg-background/50 shrink-0">
            {platform.logo.path && (
              <ThemeAwareLogo
                path={platform.logo.path}
                darkPath={platform.logo.darkPath}
                alt={platform.logo.alt || t(platform.name as keyof typeof t)}
                size={32}
                className="h-8 w-8"
              />
            )}
            {platform.logo.component && (
              <platform.logo.component />
            )}
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-medium">
            <span className="min-w-0">{t(platform.name as keyof typeof t)}</span>
            {platform.isDisabled && (
              <>
                <Badge variant="secondary" className="transition-transform duration-200 hover:scale-105">
                  {t('import.type.badge.maintenance')}
                </Badge>
                <AlertTriangle className="h-4 w-4 shrink-0 text-yellow-500 motion-safe:animate-pulse" />
              </>
            )}
            {platform.isComingSoon && !platform.isDisabled && (
              <Badge variant="secondary" className="transition-transform duration-200 hover:scale-105 bg-blue-500/10 text-blue-500 hover:bg-blue-500/20">
                {t('import.type.badge.comingSoon')}
              </Badge>
            )}
          </div>
          {showWeekendWarning && (
            <RithmicWeekendWarning className="mt-1.5" />
          )}
          <div className="text-sm text-muted-foreground">
            {t(platform.description as keyof typeof t)}
          </div>
        </div>
        {showNavigateHint && !platform.isDisabled && !platform.isComingSoon && (
          <ChevronRight className="h-4 w-4 shrink-0 self-center text-muted-foreground" aria-hidden="true" />
        )}
      </CommandItem>
    </div>
  )
}
