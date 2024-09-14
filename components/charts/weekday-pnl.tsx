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
import { useCalendarData } from "../context/trades-data"

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
    color: "hsl(var(--chart-2))",
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
  const baseColorVar = value >= 0 ? '--chart-2' : '--chart-1';
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

export default function WeeklyPnLChart() {
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

  return (
    <Card>
      <CardHeader className="sm:min-h-[120px] flex flex-col items-stretch space-y-0 border-b p-6">
        <CardTitle>Weekly Average PnL</CardTitle>
        <CardDescription>
          Showing average PnL for each day of the week
        </CardDescription>
      </CardHeader>
      <CardContent className="px-2 sm:p-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[350px] w-full"
        >
          <BarChart
            data={weekdayData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="day"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              domain={[minPnL, maxPnL]}
              tickFormatter={(value: number) => `$${value.toFixed(2)}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="pnl"
              radius={[4, 4, 0, 0]}
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