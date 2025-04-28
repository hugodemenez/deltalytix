'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { TradovateSocket } from './tradovate-udf/tradovate-socket';
import { URLs } from './tradovate-udf/urls';
import { connect } from './tradovate-udf/connect';
import { tvGet } from './tradovate-udf/services';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const { MD_URL, CHART_DATA_URL } = URLs;

interface MarketDataDialogProps {
  defaultSymbol?: string;
}

interface ChartBar {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export function MarketDataDialog({ defaultSymbol = 'MNQZ1' }: MarketDataDialogProps) {
  const [symbol, setSymbol] = useState(defaultSymbol);
  const [isConnected, setIsConnected] = useState(false);
  const [isWatching, setIsWatching] = useState(false);
  const [chartData, setChartData] = useState<ChartBar[]>([]);
  const [socketInstance, setSocketInstance] = useState<TradovateSocket | null>(null);
  const [unsubscribeFn, setUnsubscribeFn] = useState<(() => void) | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [elementSize, setElementSize] = useState(1);
  const [elementSizeUnit, setElementSizeUnit] = useState('UnderlyingUnits');
  const [barType, setBarType] = useState('MinuteBar');
  const [barCount, setBarCount] = useState(20);

  // Connect to Tradovate socket
  const connectSocket = useCallback(async () => {
    try {
      const authResponse = await connect(
        {
            name:       process.env.NEXT_PUBLIC_TRADOVATE_USERNAME,
            password:   process.env.NEXT_PUBLIC_TRADOVATE_PASSWORD,
            appId:      "Deltalytix",
            appVersion: "1.0",
            cid:        parseInt(process.env.NEXT_PUBLIC_TRADOVATE_CID || '0'),
            sec:        process.env.NEXT_PUBLIC_TRADOVATE_SECRET
        }
      );
      
      // Use the MD_URL for market data subscriptions
      const wsUrl = MD_URL;
      
      const socket = new TradovateSocket({ debugLabel: 'Market Data Dialog' });
      console.log('Auth response:', authResponse);
      console.log('Connecting to WebSocket URL:', wsUrl);
      
      await socket.connect(wsUrl, authResponse?.accessToken || '');
      
      setSocketInstance(socket);
      setIsConnected(true);
    } catch (error) {
      console.error('Failed to connect:', error);
      setIsConnected(false);
    }
  }, []);

  // Disconnect from socket
  const disconnectSocket = useCallback(() => {
    if (socketInstance) {
      if (unsubscribeFn) {
        unsubscribeFn();
        setUnsubscribeFn(null);
      }
      // Close websocket connection if possible
      if (socketInstance.ws) {
        socketInstance.ws.close();
      }
      setSocketInstance(null);
      setIsConnected(false);
      setIsWatching(false);
      setChartData([]);
    }
  }, [socketInstance, unsubscribeFn]);

  // Subscribe to chart data
  const watchSymbol = useCallback(async () => {
    if (!socketInstance || !isConnected) {
      await connectSocket();
    }

    try {
      if (socketInstance) {
        // Unsubscribe from previous subscription if exists
        if (unsubscribeFn) {
          unsubscribeFn();
          setUnsubscribeFn(null);
        }

        // Get contract ID for the symbol
        const contractRes = await tvGet('/contract/find', { name: symbol });
        let contractId = contractRes?.id;
        
        if (!contractId) {
          const suggestions = await tvGet('/contract/suggest', { name: symbol });
          contractId = suggestions?.[0]?.id;
        }

        if (!contractId) {
          throw new Error(`Could not find contract ID for symbol: ${symbol}`);
        }

        const subscriptionBody = {
          symbol: `${contractId}`, 
          chartDescription: {
            underlyingType: barType,
            elementSize: elementSize,
            elementSizeUnit: elementSizeUnit,
            withHistogram: false,
          },
          timeRange: {
            asMuchAsElements: barCount
          }
        };

        console.log('Subscription body:', subscriptionBody);

        const unsub = await socketInstance.subscribe({
          url: 'md/getchart',
          body: subscriptionBody,
          subscription: (data) => {
            if (data?.eoh) {
              console.log('End of history received.');
            }
            if (data?.bars) {
              setChartData(data.bars);
            }
          },
        });
        
        setUnsubscribeFn(() => unsub);
        setIsWatching(true);
      }
    } catch (error) {
      console.error('Failed to subscribe to chart:', error);
      setIsWatching(false);
    }
  }, [socketInstance, isConnected, unsubscribeFn, symbol, barType, elementSize, elementSizeUnit, barCount, connectSocket]);

  // Unsubscribe from chart data
  const unwatchSymbol = useCallback(() => {
    if (unsubscribeFn) {
      unsubscribeFn();
      setUnsubscribeFn(null);
      setIsWatching(false);
    }
  }, [unsubscribeFn]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeFn) {
        unsubscribeFn();
      }
      if (socketInstance?.ws) {
        socketInstance.ws.close();
      }
    };
  }, [socketInstance, unsubscribeFn]);

  // Format price with appropriate decimals
  const formatPrice = (price: number) => {
    return price.toFixed(price < 10 ? 4 : price < 100 ? 3 : price < 1000 ? 2 : 1);
  };

  // Format timestamp to readable time
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Open Chart Data</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Tradovate Chart Data</DialogTitle>
          <DialogDescription>
            Connect to Tradovate&apos;s API and watch chart data in real-time using either symbol names or contract IDs.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-6 py-4">
          <div className="flex items-center gap-4 mb-2">
            <div className="flex items-center gap-2">
              <span className={`h-3 w-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
              <span className="text-sm font-medium">{isConnected ? 'Connected' : 'Disconnected'}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Input 
              id="symbol" 
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              placeholder="Enter symbol (e.g. MNQZ1)"
              className="flex-1"
            />
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="barType">Bar Type</Label>
              <Select value={barType} onValueChange={setBarType}>
                <SelectTrigger id="barType">
                  <SelectValue placeholder="Bar Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MinuteBar">Minute Bar</SelectItem>
                  <SelectItem value="DailyBar">Daily Bar</SelectItem>
                  <SelectItem value="TickBar">Tick Bar</SelectItem>
                  <SelectItem value="VolumeBar">Volume Bar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="elementSize">Element Size</Label>
              <Input 
                id="elementSize" 
                type="number" 
                value={elementSize}
                onChange={(e) => setElementSize(parseInt(e.target.value))}
                min={1}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="elementSizeUnit">Size Unit</Label>
              <Select value={elementSizeUnit} onValueChange={setElementSizeUnit}>
                <SelectTrigger id="elementSizeUnit">
                  <SelectValue placeholder="Size Unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UnderlyingUnits">Underlying Units</SelectItem>
                  <SelectItem value="Minute">Minute</SelectItem>
                  <SelectItem value="Day">Day</SelectItem>
                  <SelectItem value="Week">Week</SelectItem>
                  <SelectItem value="Month">Month</SelectItem>
                  <SelectItem value="Volume">Volume</SelectItem>
                  <SelectItem value="Range">Range</SelectItem>
                  <SelectItem value="Tick">Tick</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="barCount">Bar Count</Label>
              <Input 
                id="barCount" 
                type="number" 
                value={barCount}
                onChange={(e) => setBarCount(parseInt(e.target.value))}
                min={1}
                max={1000}
              />
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={connectSocket}
              disabled={isConnected}
            >
              Connect
            </Button>
            <Button
              size="sm"
              onClick={disconnectSocket}
              disabled={!isConnected}
              variant="destructive"
            >
              Disconnect
            </Button>
            <Button
              size="sm"
              onClick={watchSymbol}
              disabled={!isConnected || isWatching || !symbol}
            >
              Watch Chart
            </Button>
            <Button
              size="sm"
              onClick={unwatchSymbol}
              disabled={!isWatching}
              variant="secondary"
            >
              Unwatch
            </Button>
          </div>
          
          {chartData.length > 0 && (
            <Card className="p-4 overflow-auto max-h-96">
              <div className="text-sm">
                <div className="grid grid-cols-6 gap-2 font-medium border-b pb-2">
                  <div>Time</div>
                  <div>Open</div>
                  <div>High</div>
                  <div>Low</div>
                  <div>Close</div>
                  <div>Volume</div>
                </div>
                {chartData.map((bar, index) => (
                  <div key={index} className="grid grid-cols-6 gap-2 py-2 border-b border-gray-100 last:border-0">
                    <div className="text-xs">{formatTimestamp(bar.timestamp)}</div>
                    <div className="font-mono">{formatPrice(bar.open)}</div>
                    <div className="font-mono">{formatPrice(bar.high)}</div>
                    <div className="font-mono">{formatPrice(bar.low)}</div>
                    <div className={`font-mono ${bar.close >= bar.open ? 'text-green-500' : 'text-red-500'}`}>
                      {formatPrice(bar.close)}
                    </div>
                    <div className="font-mono">{bar.volume || 'N/A'}</div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
        
        <DialogFooter className="sm:justify-start">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setIsOpen(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 