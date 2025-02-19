'use client';

import { createChart, ColorType, CandlestickData, Time, CandlestickSeries, LineSeries } from 'lightweight-charts';
import { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { WidgetSize } from '@/app/[locale]/(dashboard)/types/dashboard';
import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useI18n } from "@/locales/client";

interface MarketChartProps {
  size?: WidgetSize;
  containerClassName?: string;
}

// Mock data for demonstration
const mockCandlestickData: CandlestickData[] = [
  { time: '2024-01-01', open: 100, high: 105, low: 98, close: 103 },
  { time: '2024-01-02', open: 103, high: 107, low: 100, close: 105 },
  { time: '2024-01-03', open: 105, high: 110, low: 101, close: 107 },
  { time: '2024-01-04', open: 107, high: 112, low: 105, close: 106 },
  { time: '2024-01-05', open: 106, high: 108, low: 102, close: 104 },
];

// Mock trade points
const mockTrades = [
  { time: '2024-01-02', price: 102, type: 'entry' },
  { time: '2024-01-04', price: 108, type: 'exit' },
];

export default function MarketChart({ size = 'medium', containerClassName }: MarketChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof createChart>>();
  const t = useI18n();

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart instance
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#64748b',
      },
      grid: {
        vertLines: { color: '#334155' },
        horzLines: { color: '#334155' },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: '#334155',
          width: 1,
          style: 2,
          visible: true,
          labelVisible: true,
        },
        horzLine: {
          color: '#334155',
          width: 1,
          style: 2,
          visible: true,
          labelVisible: true,
        },
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
    });

    // Create candlestick series
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    // Add candlestick data with markers
    const dataWithMarkers = mockCandlestickData.map(candle => {
      const trade = mockTrades.find(t => t.time === candle.time);
      if (trade) {
        return {
          ...candle,
          marker: {
            position: trade.type === 'entry' ? 'belowBar' : 'aboveBar',
            color: trade.type === 'entry' ? '#22c55e' : '#ef4444',
            shape: trade.type === 'entry' ? 'arrowUp' : 'arrowDown',
            size: 3,
          }
        };
      }
      return candle;
    });

    candlestickSeries.setData(dataWithMarkers);

    // Add price lines for entry and exit points
    mockTrades.forEach((trade) => {
      candlestickSeries.createPriceLine({
        price: trade.price,
        color: trade.type === 'entry' ? '#22c55e' : '#ef4444',
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: trade.type === 'entry' ? 'Entry' : 'Exit',
      });
    });

    // Subscribe to click events
    chart.subscribeClick((param) => {
      if (param.time) {
        const trade = mockTrades.find(t => t.time === param.time);
        if (trade) {
          console.log(`Clicked on ${trade.type} point at price ${trade.price}`);
        }
      }
    });

    // Enable kinetic scrolling
    chart.timeScale().applyOptions({
      rightOffset: 12,
      barSpacing: 20,
      timeVisible: true,
      secondsVisible: false,
      shiftVisibleRangeOnNewBar: true,
    });

    // Fit content and handle resize
    chart.timeScale().fitContent();

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    chartRef.current = chart;

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader 
        className={cn(
          "flex flex-row items-center justify-between space-y-0 border-b shrink-0",
          size === 'small-long' ? "p-2 h-[40px]" : "p-3 sm:p-4 h-[56px]"
        )}
      >
        <div className="flex items-center gap-1.5">
          <CardTitle 
            className={cn(
              "line-clamp-1",
              size === 'small-long' ? "text-sm" : "text-base"
            )}
          >
            Market Chart
          </CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className={cn(
                  "text-muted-foreground hover:text-foreground transition-colors cursor-help",
                  size === 'small-long' ? "h-3.5 w-3.5" : "h-4 w-4"
                )} />
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>View price action and trade entry/exit points. Green arrows indicate entries, red arrows indicate exits.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent 
        className={cn(
          "flex-1 min-h-0",
          size === 'small-long' ? "p-1" : "p-2 sm:p-4"
        )}
      >
        <div 
          ref={chartContainerRef} 
          className={cn(
            "w-full h-full",
            containerClassName
          )}
        />
      </CardContent>
    </Card>
  );
}
