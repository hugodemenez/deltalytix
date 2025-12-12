'use client'

import { Badge } from "@/components/ui/badge"
import { CommandItem } from "@/components/ui/command"
import { cn } from "@/lib/utils"
import { AlertTriangle } from "lucide-react"
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
}

export function PlatformItem({
  platform,
  isSelected,
  onSelect,
  onHover,
  onLeave,
  isWeekend
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
          "flex items-stretch gap-4 ml-6 border-l-2 border-muted pl-4 transition-all duration-200 rounded-none",
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
        <div className="flex-1">
          <div className="font-medium flex items-center gap-2">
            {t(platform.name as keyof typeof t)}
            {platform.isDisabled && (
              <>
                <Badge variant="secondary" className="ml-2 transition-transform duration-200 hover:scale-105">
                  {t('import.type.badge.maintenance')}
                </Badge>
                <AlertTriangle className="h-4 w-4 text-yellow-500 animate-pulse" />
              </>
            )}
            {platform.isComingSoon && !platform.isDisabled && (
              <>
                <Badge variant="secondary" className="ml-2 transition-transform duration-200 hover:scale-105 bg-blue-500/10 text-blue-500 hover:bg-blue-500/20">
                  {t('import.type.badge.comingSoon')}
                </Badge>
              </>
            )}
            {!platform.isDisabled && platform.isRithmic && isWeekend && (
              <div className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-500/20 gap-1.5 ml-2">
                <AlertTriangle className="h-3 w-3" />
                {t('import.type.rithmicWeekendWarning')}
              </div>
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            {t(platform.description as keyof typeof t)}
          </div>
        </div>
      </CommandItem>
    </div>
  )
} 