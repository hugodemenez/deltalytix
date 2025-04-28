'use client';

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { WidgetSize } from '@/app/[locale]/(dashboard)/types/dashboard';
import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState } from 'react';
import Script from 'next/script';
import { ResolutionString } from '@/public/static/charting_library/charting_library';
import { getTradovateAccessToken } from "../../actions/tradovate-auth";
import { Button } from "@/components/ui/button";
import { URLs } from './tradovate-udf/urls'
import { TradovateSocket } from "./tradovate-udf/tradovate-socket";
import { connect } from "./tradovate-udf/connect";
import { MarketDataDialog } from "./market-data-dialog";
import { Input } from "@/components/ui/input";

const { MD_URL } = URLs


interface MarketChartProps {
  size?: WidgetSize;
}

const TVChartContainer = dynamic(
  () => import('./TVChartContainer').then((mod) => mod.TVChartContainer),
  { ssr: false }
);

export default function MarketChart({ size = 'medium' }: MarketChartProps) {
  const [isScriptReady, setIsScriptReady] = useState(false);


  return (
    <>
      <Script
        src="/static/datafeeds/udf/dist/bundle.js"
        strategy="lazyOnload"
        onReady={() => {
          setIsScriptReady(true);
        }}
      />
      {isScriptReady && (
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
            <MarketDataDialog />
          </CardHeader>
          <CardContent 
            className={cn(
              "flex-1 min-h-0",
              size === 'small-long' ? "p-1" : "p-2 sm:p-4"
            )}
          >
            <TVChartContainer 
              interval={"1D" as ResolutionString}
              library_path="/charting_library/"
              locale="en"
              charts_storage_url="https://saveload.tradingview.com"
              charts_storage_api_version="1.1"
              client_id="tradingview.com"
              user_id="public_user"
              fullscreen={false}
              autosize={true}
            />
          </CardContent>
        </Card>
      )}
    </>
  );
}
