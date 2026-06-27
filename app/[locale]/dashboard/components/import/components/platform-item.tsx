'use client'

import { Badge } from "@/components/ui/badge"
import { CommandItem } from "@/components/ui/command"
import { cn } from "@/lib/utils"
import { AlertTriangle, ChevronRight } from "lucide-react"
import Image from "next/image"
import { PlatformConfig } from "../config/platforms"
import { useI18n } from "@/locales/client"

interface PlatformItemProps {
  platform: PlatformConfig
  isSelected: boolean
  onSelect: (type: string) => void
  onHover: (category: string) => void
  onLeave: () => void
  isWeekend: boolean
  showNavigateHint?: boolean
}

export function PlatformItem({
  platform,
  isSelected,
  onSelect,
  onHover,
  onLeave,
  isWeekend,
  showNavigateHint = false,
}: PlatformItemProps) {
  const t = useI18n()

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
              <Image
                src={platform.logo.path}
                alt={platform.logo.alt || ''}
                width={32}
                height={32}
                className="object-contain"
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
                <AlertTriangle className="h-4 w-4 shrink-0 text-yellow-500 animate-pulse" />
              </>
            )}
            {platform.isComingSoon && !platform.isDisabled && (
              <Badge variant="secondary" className="transition-transform duration-200 hover:scale-105 bg-blue-500/10 text-blue-500 hover:bg-blue-500/20">
                {t('import.type.badge.comingSoon')}
              </Badge>
            )}
          </div>
          {!platform.isDisabled && platform.isRithmic && isWeekend && (
            <p className="mt-1.5 flex items-start gap-1.5 rounded-md bg-yellow-500/10 px-2 py-1 text-[11px] leading-snug text-yellow-800 dark:text-yellow-400 sm:text-xs">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
              <span>
                <span className="sm:hidden">{t('import.type.rithmicWeekendWarningShort')}</span>
                <span className="hidden sm:inline">{t('import.type.rithmicWeekendWarning')}</span>
              </span>
            </p>
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