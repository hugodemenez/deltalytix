"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { SheetTooltip, SheetTooltipContent, SheetTooltipProvider, SheetTooltipTrigger } from "@/components/ui/sheet-tooltip"
import { cn } from "@/lib/utils"

export interface Account {
  id: string
  number: string
  avatar?: string
  initials: string
  color: string
  groupId?: string | null
}

interface AccountCoinProps {
  account: Account
  isDragging?: boolean
  onMouseEnter?: () => void
  onMouseLeave?: () => void
  onDragStart?: (e: React.DragEvent, account: Account) => void
  onDragEnd?: () => void
  style?: React.CSSProperties
  className?: string
}

export function AccountCoin({
  account,
  isDragging = false,
  onMouseEnter,
  onMouseLeave,
  onDragStart,
  onDragEnd,
  style,
  className,
}: AccountCoinProps) {
  const [isAnimating, setIsAnimating] = useState(false)
  const coinRef = useRef<HTMLDivElement>(null)

  const handleDragStart = (e: React.DragEvent) => {
    setIsAnimating(true)
    onDragStart?.(e, account)

    // Add coin throw animation
    if (coinRef.current) {
      coinRef.current.classList.add("coin-throw")
    }
  }

  const handleDragEnd = () => {
    setIsAnimating(false)
    onDragEnd?.()

    // Remove animation classes
    if (coinRef.current) {
      coinRef.current.classList.remove("coin-throw")
      coinRef.current.classList.add("coin-bounce")
      setTimeout(() => {
        coinRef.current?.classList.remove("coin-bounce")
      }, 300)
    }
  }

  // Generate initials from account number
  const getInitials = (number: string) => {
    // Take first 2 characters, or if it's all numbers, use first 2 digits
    const cleanNumber = number.replace(/[^A-Za-z0-9]/g, '')
    if (cleanNumber.length >= 2) {
      return cleanNumber.substring(0, 2).toUpperCase()
    }
    return cleanNumber.toUpperCase()
  }

  // Generate color based on account number
  const getColor = (number: string) => {
    const colors = [
      "bg-blue-500",
      "bg-green-500", 
      "bg-purple-500",
      "bg-orange-500",
      "bg-red-500",
      "bg-teal-500",
      "bg-indigo-500",
      "bg-pink-500",
      "bg-slate-500",
      "bg-amber-500",
      "bg-cyan-500"
    ]
    const hash = number.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0)
      return a & a
    }, 0)
    return colors[Math.abs(hash) % colors.length]
  }

  const initials = account.initials || getInitials(account.number)
  const color = account.color || getColor(account.number)

  return (
    <SheetTooltipProvider>
      <SheetTooltip>
        <SheetTooltipTrigger asChild>
          <div
            ref={coinRef}
            draggable
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            style={style}
            className={cn(
              "relative cursor-grab active:cursor-grabbing transition-all duration-300 ease-out",
              "hover:z-10 hover:scale-105",
              isDragging && "opacity-50 scale-110 rotate-12",
              isAnimating && "transition-none",
              className,
            )}
          >
            <div
              className={cn(
                "relative w-12 h-12 rounded-full border-2 border-border/20 shadow-lg",
                "bg-gradient-to-br from-card to-card/80 backdrop-blur-sm",
                "hover:shadow-xl hover:border-primary/30",
                "transition-all duration-300 ease-out",
              )}
            >
              <Avatar className="w-full h-full">
                <AvatarFallback className={cn("text-xs font-semibold text-white", color)}>
                  {initials}
                </AvatarFallback>
              </Avatar>

              {/* Shine effect */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />
            </div>
          </div>
        </SheetTooltipTrigger>
        <SheetTooltipContent>
          <span className="text-sm font-medium">{account.number}</span>
        </SheetTooltipContent>
      </SheetTooltip>
    </SheetTooltipProvider>
  )
}
