"use client"

import { type ReactNode, useState, useEffect } from "react"
import { cn } from "@/lib/utils"

interface AIBorderProps {
  children: ReactNode
  className?: string
  success?: boolean
}

export function AIBorder({ children, className, success = false }: AIBorderProps) {
  // Track if we've seen the success state to trigger animation
  const [hasSeenSuccess, setHasSeenSuccess] = useState(false)

  // When success changes to true, set hasSeenSuccess
  useEffect(() => {
    if (success && !hasSeenSuccess) {
      setHasSeenSuccess(true)
    }
  }, [success, hasSeenSuccess])

  return (
    <div
      className={cn(
        "relative rounded-lg overflow-hidden",
        "border-2 transition-colors duration-500",
        success
          ? "border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.5)]"
          : "border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]",
        "w-full h-full",
        className,
      )}
    >
      {/* Content container */}
      <div className="relative bg-gray-950 z-10 w-full h-full">
        {/* Scanner effect overlay - Only show when not in success state */}
        {!success && (
          <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
            <div className="absolute left-0 right-0 h-[3px] bg-linear-to-r from-transparent via-blue-400 to-transparent opacity-80 animate-scanner-smooth" />
          </div>
        )}

        {/* Success overlay - Only show when in success state */}
        {success && (
          <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
            {/* Success pulse effect */}
            <div className="absolute inset-0 bg-green-500/5 animate-success-pulse" />



            {/* Success sweep effect */}
            <div className="absolute inset-0 bg-linear-to-r from-transparent via-green-400/20 to-transparent animate-success-sweep" />
          </div>
        )}

        {/* Actual content */}
        <div
          className={cn(
            "w-full h-full transition-opacity duration-500",
            success && hasSeenSuccess ? "opacity-70" : "opacity-100",
          )}
        >
          {children}
        </div>
      </div>

      {/* Glowing border effect */}
      <div className="absolute inset-0 -z-10">
        <div
          className={cn(
            "absolute inset-[-2px] rounded-lg opacity-60",
            success
              ? "bg-linear-to-r from-green-600 to-emerald-600 animate-glow-success"
              : "bg-linear-to-r from-blue-600 to-purple-600 animate-glow-subtle",
          )}
        />
      </div>

      {/* Indicator light */}
      <div
        className={cn(
          "absolute top-0 right-0 w-2 h-2 rounded-full m-1",
          success ? "bg-green-500 animate-pulse" : "bg-blue-500 animate-pulse",
        )}
      />
    </div>
  )
}

