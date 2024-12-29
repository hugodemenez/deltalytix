"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface GaugeProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number
  max: number
  size?: "sm" | "md" | "lg"
  showValue?: boolean
  label?: string
  type?: "profit" | "drawdown"
}

export function Gauge({
  value,
  max,
  size = "md",
  showValue = true,
  label,
  type = "profit",
  className,
  ...props
}: GaugeProps) {
  // Normalize value between 0 and 100
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)
  
  // Size configurations
  const sizeConfig = {
    sm: { width: 120, fontSize: "text-sm", strokeWidth: 8 },
    md: { width: 160, fontSize: "text-base", strokeWidth: 12 },
    lg: { width: 200, fontSize: "text-lg", strokeWidth: 16 },
  }

  const { width, fontSize, strokeWidth } = sizeConfig[size]
  
  // Calculate SVG parameters
  const radius = (width - strokeWidth) / 2
  const circumference = radius * Math.PI // Only using half circle
  const strokeDashoffset = (circumference * (100 - percentage)) / 100

  return (
    <div
      className={cn("flex flex-col items-center justify-center", className)}
      {...props}
    >
      <div className="relative" style={{ width: width, height: width / 2 }}>
        <svg
          width={width}
          height={width / 2}
          viewBox={`0 0 ${width} ${width/2}`}
          style={{ overflow: 'visible', display: 'block' }}
          className="scale-y-[-1]"
        >
          <g transform={`translate(0, ${width/2})`}>
            {/* Background track */}
            <path
              d={`M ${strokeWidth / 2} 0 A ${radius} ${radius} 0 0 0 ${width - strokeWidth / 2} 0`}
              fill="none"
              stroke="#e5e5e5"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              style={{ zIndex: 1 }}
            />
            
            {/* Foreground track */}
            <path
              d={`M ${strokeWidth / 2} 0 A ${radius} ${radius} 0 0 0 ${width - strokeWidth / 2} 0`}
              fill="none"
              stroke={type === "profit" ? "#22c55e" : "#ef4444"}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              style={{
                strokeDasharray: circumference,
                strokeDashoffset,
                transition: "stroke-dashoffset 0.3s ease-in-out",
                zIndex: 2,
              }}
            />
          </g>
        </svg>
        
        {/* Value display */}
        {showValue && (
          <div
            className={cn(
              "absolute inset-0 flex flex-col items-center justify-center",
              fontSize
            )}
          >
            <span className={cn(
              "font-bold",
              type === "profit" ? "text-[#22c55e]" : "text-[#ef4444]"
            )}>
              {percentage.toFixed(2)}%
            </span>
            {label && (
              <span className="text-xs text-muted-foreground mt-1">
                {label}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
} 