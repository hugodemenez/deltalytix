"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, TooltipProps, Cell } from "recharts"
import { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
} from "@/components/ui/chart"
import { Trade } from "@prisma/client"
import { useCalendarData } from "../../../../../components/context/trades-data"
import { cn } from "@/lib/utils"
import { ResponsiveContainer } from "recharts"

export const description = "An interactive bar chart showing average PnL for each day of the week"

export type CalendarEntry = {
  pnl: number;
  tradeNumber: number;
  longNumber: number;
  shortNumber: number;
  trades: Trade[];
};

export type CalendarData = {
  [date: string]: CalendarEntry;
};

const chartConfig = {
  pnl: {
    label: "Average PnL",
    color: "hsl(var(--chart-5))",
  },
} satisfies ChartConfig

const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const CustomTooltip = ({ active, payload, label }: TooltipProps<ValueType, NameType>) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background p-2 border rounded shadow-sm">
        <p className="font-semibold">{`${label}`}</p>
        <p className="text-sm">{`Average PnL: $${Number(payload[0].value).toFixed(2)}`}</p>
      </div>
    );
  }

  return null;
};

const getColor = (value: number, min: number, max: number, darkMode: boolean) => {
  const ratio = Math.abs((value - min) / (max - min));
  const baseColorVar = value >= 0 ? '--chart-3' : '--chart-4';
  const baseColor = getComputedStyle(document.documentElement).getPropertyValue(baseColorVar).trim();
  const [h, s, l] = baseColor.split(' ').map(val => parseFloat(val));
  
  const saturation = darkMode ? 
    Math.min(100, s + ratio * 60) : // Increase saturation significantly in dark mode
    30
  
  const lightness = darkMode ?
    Math.max(20, 60 - ratio * 40) : // Darker colors for higher absolute values in dark mode
    Math.max(30, 70 - ratio * 40); // More pronounced color range in light mode

  return `hsl(${h}, ${saturation}%, ${lightness}%)`;
};

interface WeekdayPNLChartProps {
  size?: 'small' | 'medium' | 'large' | 'small-long'
}

export default function WeekdayPNLChart({ size = 'medium' }: WeekdayPNLChartProps) {
  const {calendarData} = useCalendarData()
  const [darkMode, setDarkMode] = React.useState(false);

  React.useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains('dark');
    setDarkMode(isDarkMode);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          setDarkMode(document.documentElement.classList.contains('dark'));
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true });

    return () => observer.disconnect();
  }, []);

  const weekdayData = React.useMemo(() => {
    const weekdayTotals = daysOfWeek.reduce((acc, day) => ({ ...acc, [day]: { total: 0, count: 0 } }), {} as Record<string, { total: number, count: number }>);

    Object.entries(calendarData).forEach(([date, entry]) => {
      const dayOfWeek = new Date(date).toLocaleString('en-US', { weekday: 'long' });
      weekdayTotals[dayOfWeek].total += entry.pnl;
      weekdayTotals[dayOfWeek].count += 1;
    });

    return daysOfWeek.map(day => ({
      day,
      pnl: weekdayTotals[day].count > 0 ? weekdayTotals[day].total / weekdayTotals[day].count : 0,
    }));
  }, [calendarData]);

  const maxPnL = Math.max(...weekdayData.map(d => d.pnl));
  const minPnL = Math.min(...weekdayData.map(d => d.pnl));

  const getChartHeight = () => {
    switch (size) {
      case 'small':
      case 'small-long':
        return 'h-[140px]'
      case 'medium':
        return 'h-[240px]'
      case 'large':
        return 'h-[280px]'
      default:
        return 'h-[240px]'
    }
  }

  const getYAxisWidth = () => {
    const maxLength = Math.max(
      Math.abs(minPnL).toFixed(2).length,
      Math.abs(maxPnL).toFixed(2).length
    );
    return (size === 'small' || size === 'small-long')
      ? Math.max(35, 8 * (maxLength + 1))
      : Math.max(45, 10 * (maxLength + 1));
  }

  return (
    <Card className="h-full">
      <CardHeader 
        className={cn(
          "flex flex-col items-stretch space-y-0 border-b",
          (size === 'small' || size === 'small-long')
            ? "p-2" 
            : "p-4 sm:p-6"
        )}
      >
        <div className="flex items-center justify-between">
          <CardTitle 
            className={cn(
              "line-clamp-1",
              (size === 'small' || size === 'small-long') ? "text-sm" : "text-base sm:text-lg"
            )}
          >
            Weekly Average PnL
          </CardTitle>
        </div>
        <CardDescription 
          className={cn(
            (size === 'small' || size === 'small-long') ? "hidden" : "text-xs sm:text-sm"
          )}
        >
          Showing average PnL for each day of the week
        </CardDescription>
      </CardHeader>
      <CardContent 
        className={cn(
          (size === 'small' || size === 'small-long') ? "p-1" : "p-2 sm:p-6"
        )}
      >
        <ChartContainer
          config={chartConfig}
          className={cn(
            "w-full",
            getChartHeight(),
            (size === 'small' || size === 'small-long')
              ? "aspect-[3/2]" 
              : "aspect-[4/3] sm:aspect-[16/9]"
          )}
        >
            <BarChart
              data={weekdayData}
              margin={
                (size === 'small' || size === 'small-long')
                  ? { left: 10, right: 4, top: 4, bottom: 0 }
                  : { left: 16, right: 8, top: 8, bottom: 0 }
              }
            >
              <CartesianGrid 
                strokeDasharray="3 3" 
                opacity={(size === 'small' || size === 'small-long') ? 0.5 : 1}
              />
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                tickMargin={(size === 'small' || size === 'small-long') ? 4 : 8}
                tick={{ fontSize: (size === 'small' || size === 'small-long') ? 10 : 12 }}
                interval={(size === 'small' || size === 'small-long') ? 1 : "preserveStartEnd"}
                tickFormatter={(value) => (size === 'small' || size === 'small-long') ? value.slice(0, 3) : value}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={(size === 'small' || size === 'small-long') ? 4 : 8}
                tick={{ 
                  fontSize: (size === 'small' || size === 'small-long') ? 10 : 12,
                  fill: 'currentColor'
                }}
                width={getYAxisWidth()}
                domain={[minPnL, maxPnL]}
                tickFormatter={(value: number) => `$${value.toFixed(2)}`}
                allowDataOverflow={false}
                label={(size === 'small' || size === 'small-long') ? undefined : { 
                  value: "P/L", 
                  angle: -90, 
                  position: 'insideLeft',
                  fontSize: 12
                }}
              />
              <Tooltip 
                content={<CustomTooltip />}
                wrapperStyle={{ 
                  fontSize: (size === 'small' || size === 'small-long') ? '10px' : '12px'
                }} 
              />
              <Bar
                dataKey="pnl"
                radius={[4, 4, 0, 0]}
                maxBarSize={(size === 'small' || size === 'small-long') ? 30 : 50}
                className="transition-all duration-300 ease-in-out"
              >
                {weekdayData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={getColor(entry.pnl, minPnL, maxPnL, darkMode)} 
                  />
                ))}
              </Bar>
            </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}