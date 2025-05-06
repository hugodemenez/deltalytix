'use client';

import { useEffect, useRef, useState } from 'react';
import { useTheme } from '@/components/context/theme-provider';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useCurrentLocale } from "@/locales/client";
interface NewsWidgetProps {
  className?: string;
}

export function NewsWidget({ className }: NewsWidgetProps) {
  const { effectiveTheme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const widgetId = useRef(`tradingview-widget-${Math.random().toString(36).substring(7)}`);
  const initTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const locale = useCurrentLocale()

  useEffect(() => {
    setIsLoading(true);
    // Capture the current value of widgetId.current for use in cleanup
    const currentWidgetId = widgetId.current;

    // Clear any existing timeout
    if (initTimeoutRef.current) {
      clearTimeout(initTimeoutRef.current);
    }

    // Wait a bit for the container to be properly sized
    initTimeoutRef.current = setTimeout(() => {
      const container = document.getElementById(currentWidgetId);
      if (!container) return;

      const rect = container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      // Clean up existing content
      container.innerHTML = '';

      // Create widget container
      const widgetContainer = document.createElement('div');
      widgetContainer.className = 'tradingview-widget-container__widget';
      widgetContainer.style.height = '100%';
      container.appendChild(widgetContainer);

      // Create and configure the script
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.async = true;
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-events.js';
      
      script.innerHTML = JSON.stringify({
        "width": "100%",
        "height": "100%",
        "colorTheme": effectiveTheme,
        "isTransparent": true,
        "locale": locale,
        "importanceFilter": "0,1",
        "countryFilter": "au,fr,de,gb,us,eu"
      });

      // Add load event listener to hide skeleton
      script.onload = () => {
        setIsLoading(false);
      };

      container.appendChild(script);
    }, 100);

    return () => {
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
      }
      const container = document.getElementById(currentWidgetId);
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [effectiveTheme]);

  return (
    <Card className={`h-full w-full overflow-hidden ${className || ''}`}>
      <CardHeader 
        className="flex flex-row items-center justify-between space-y-0 border-b shrink-0 p-3 sm:p-4 h-[56px]"
      >
        <div className="flex items-center gap-1.5">
          <CardTitle className="text-base line-clamp-1">Market News</CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>Real-time market news and economic events</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="relative h-[calc(100%-56px)] p-0">
        {isLoading && (
          <div className="absolute inset-0 z-10 p-4 space-y-4">
            <div className="flex items-center space-x-4">
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-16 ml-auto" />
            </div>
            <div className="flex items-center space-x-4">
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-16 ml-auto" />
            </div>
            <div className="flex items-center space-x-4">
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-16 ml-auto" />
            </div>
          </div>
        )}
        <div 
          id={widgetId.current}
          className="tradingview-widget-container h-full w-full"
        />
      </CardContent>
    </Card>
  );
} 