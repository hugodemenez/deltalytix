"use client"

import type React from "react"
import { useMemo, useState } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

export interface Account {
  id: string
  number: string
  avatar?: string
  initials: string
  color: string
  groupId?: string | null
  groupName?: string | null
  balance?: number
  isPlaceholder?: boolean
}

interface AccountCoinProps {
  account: Account
  selectable?: boolean
  selected?: boolean
  disabled?: boolean
  isDragging?: boolean
  dragHandleLabel?: string
  meta?: string
  balanceLabel?: string
  onMouseEnter?: () => void
  onMouseLeave?: () => void
  onDragStart?: (e: React.DragEvent, account: Account) => void
  onDragEnd?: () => void
  onSelectToggle?: (account: Account) => void
  style?: React.CSSProperties
  className?: string
  draggableEnabled?: boolean
}

export function AccountCoin({
  account,
  selectable = false,
  selected = false,
  disabled = false,
  isDragging = false,
  dragHandleLabel,
  meta,
  balanceLabel,
  onMouseEnter,
  onMouseLeave,
  onDragStart,
  onDragEnd,
  onSelectToggle,
  style,
  className,
  draggableEnabled = true,
}: AccountCoinProps) {
  const [isAnimating, setIsAnimating] = useState(false)

  const handleDragStart = (e: React.DragEvent) => {
    if (!draggableEnabled || disabled) return
    setIsAnimating(true)
    onDragStart?.(e, account)
  }

  const handleDragEnd = () => {
    setIsAnimating(false)
    onDragEnd?.()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!selectable || disabled) return
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault()
      onSelectToggle?.(account)
    }
  }

  // Generate color based on account number
  const getColorPalette = (seed: string) => {
    const hash = seed.split("").reduce((acc, char) => {
      acc = ((acc << 5) - acc) + char.charCodeAt(0)
      return acc & acc
    }, 0)
    const hue = Math.abs(hash) % 360
    const base = `hsl(${hue}, 70%, 52%)`
    return {
      base,
      bg: `hsla(${hue}, 70%, 52%, 0.1)`,
      border: `hsla(${hue}, 70%, 52%, 0.25)`,
      text: `hsl(${hue}, 55%, 30%)`,
    }
  }

  const palette = useMemo(() => getColorPalette(account.number), [account.number])

  const content = (
    <div
      role={selectable ? "checkbox" : undefined}
      aria-checked={selectable ? selected : undefined}
      tabIndex={selectable ? 0 : undefined}
      onKeyDown={handleKeyDown}
      draggable={draggableEnabled && !disabled}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={cn(
        "relative flex min-w-0 w-full max-w-full items-center gap-3 rounded-lg border bg-card px-3 py-2 shadow-sm",
        "sm:w-full sm:min-w-[120px] sm:max-w-full",
        "transition-all duration-200 ease-out",
        draggableEnabled && !disabled && "cursor-grab active:cursor-grabbing",
        "hover:border-primary/50 hover:shadow-md",
        isDragging && "opacity-60 ring-2 ring-primary/60 ring-offset-2 ring-offset-background",
        isAnimating && "transition-none",
        selectable && "pr-3",
        disabled && "opacity-60 pointer-events-none",
        className,
      )}
      aria-label={account.number}
      title={account.number}
      style={{
        ...style,
        backgroundColor: palette.bg,
        borderColor: palette.border,
      }}
    >
      {selectable && (
        <Checkbox
          aria-label={dragHandleLabel || account.number}
          checked={selected}
          onCheckedChange={() => onSelectToggle?.(account)}
          disabled={disabled}
        />
      )}

      <div
        className="h-9 w-0.5 rounded-full"
        style={{ backgroundColor: palette.base }}
        aria-hidden
      />

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="text-sm font-medium leading-5 truncate"
            style={{ color: palette.text }}
          >
            {account.number}
          </span>

        </div>

        {(meta || balanceLabel) && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {balanceLabel && <span className="font-medium">{balanceLabel}</span>}
            {meta && (
              <>
                <span aria-hidden>•</span>
                <span className="truncate">{meta}</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <Tooltip delayDuration={150}>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent side="top" align="start">
        {account.number}
      </TooltipContent>
    </Tooltip>
  )
}
