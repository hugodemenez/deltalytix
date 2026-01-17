"use client"

import React, { useMemo } from "react"
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts"

import { cn } from "@/lib/utils"
import { ChartContainer, ChartConfig } from "@/components/ui/chart"

type SparkChartProps<T extends Record<string, unknown>> = {
  data: T[]
  index: keyof T
  categories: Array<keyof T>
  colors?: Partial<Record<string, string>>
  className?: string
  height?: number
}

function useSparkConfig(
  categories: Array<keyof Record<string, unknown>>,
  colors?: Partial<Record<string, string>>
) {
  return useMemo(() => {
    const config: ChartConfig = {}
    categories.forEach((key, index) => {
      const colorOverride = colors?.[String(key)]
      config[String(key)] = {
        label: String(key),
        color: colorOverride ?? `hsl(var(--chart-${index + 1}))`,
      }
    })
    return config
  }, [categories, colors])
}

function SparkChartFrame<T extends Record<string, unknown>>({
  data,
  index,
  categories,
  colors,
  className,
  height = 28,
  children,
}: SparkChartProps<T> & {
  children: React.ReactNode
}) {
  const config = useSparkConfig(categories, colors)

  return (
    <ChartContainer
      config={config}
      className={cn("w-full", className)}
      style={{ height }}
    >
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </ChartContainer>
  )
}

export function SparkAreaChart<T extends Record<string, unknown>>(
  props: SparkChartProps<T>
) {
  const { data, index, categories, colors, className, height } = props

  return (
    <SparkChartFrame
      data={data}
      index={index}
      categories={categories}
      colors={colors}
      className={className}
      height={height}
    >
      <AreaChart data={data}>
        <XAxis dataKey={String(index)} hide />
        <YAxis hide domain={["dataMin", "dataMax"]} />
        {categories.map((category) => (
          <Area
            key={String(category)}
            type="monotone"
            dataKey={String(category)}
            stroke={`var(--color-${String(category)})`}
            fill={`var(--color-${String(category)})`}
            strokeWidth={1.5}
            fillOpacity={0.25}
            dot={false}
            isAnimationActive={false}
            baseValue={0}
          />
        ))}
      </AreaChart>
    </SparkChartFrame>
  )
}

export function SparkLineChart<T extends Record<string, unknown>>(
  props: SparkChartProps<T>
) {
  const { data, index, categories, colors, className, height } = props

  return (
    <SparkChartFrame
      data={data}
      index={index}
      categories={categories}
      colors={colors}
      className={className}
      height={height}
    >
      <LineChart data={data}>
        <XAxis dataKey={String(index)} hide />
        <YAxis hide domain={["dataMin", "dataMax"]} />
        {categories.map((category) => (
          <Line
            key={String(category)}
            type="monotone"
            dataKey={String(category)}
            stroke={`var(--color-${String(category)})`}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </SparkChartFrame>
  )
}

export function SparkBarChart<T extends Record<string, unknown>>(
  props: SparkChartProps<T>
) {
  const { data, index, categories, colors, className, height } = props

  return (
    <SparkChartFrame
      data={data}
      index={index}
      categories={categories}
      colors={colors}
      className={className}
      height={height}
    >
      <BarChart data={data}>
        <XAxis dataKey={String(index)} hide />
        <YAxis hide domain={["dataMin", "dataMax"]} />
        {categories.map((category) => (
          <Bar
            key={String(category)}
            dataKey={String(category)}
            fill={`var(--color-${String(category)})`}
            radius={[3, 3, 3, 3]}
            isAnimationActive={false}
          />
        ))}
      </BarChart>
    </SparkChartFrame>
  )
}
