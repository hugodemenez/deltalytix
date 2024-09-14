'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { toast } from '@/hooks/use-toast'
import { Trade } from '@prisma/client'
import { getDomainOfItemsWithSameAxis } from 'recharts/types/util/ChartUtils'

interface TradovateProcessorProps {
    headers: string[];
    csvData: string[][];
    setProcessedTrades: React.Dispatch<React.SetStateAction<Trade[]>>;
}

const formatPnl = (pnl: string | undefined): { pnl: number, error?: string } => {
    if (typeof pnl !== 'string' || pnl.trim() === '') {
      console.warn('Invalid PNL value:', pnl);
      return { pnl: 0, error: 'Invalid PNL value' };
    }

    let formattedPnl = pnl.trim();

    if (formattedPnl.includes('(')) {
      formattedPnl = formattedPnl.replace('(', '-').replace(')', '');
    }

    const numericValue = parseFloat(formattedPnl.replace(/[$,]/g, ''));

    if (isNaN(numericValue)) {
      console.warn('Unable to parse PNL value:', pnl);
      return { pnl: 0, error: 'Unable to parse PNL value' };
    }

    return { pnl: numericValue };
  };

  const convertTimeInPosition = (time: string | undefined): number | undefined => {
    if (typeof time !== 'string' || time.trim() === '') {
      console.warn('Invalid time value:', time);
      return 0;
    }
    if (/^\d+\.\d+$/.test(time)) {
      // Round to the nearest second
      const floatTime = Math.round(parseFloat(time));
      return floatTime;
    }
    const timeInPosition = time;
    const minutesMatch = timeInPosition.match(/(\d+)min/);
    const secondsMatch = timeInPosition.match(/(\d+)sec/);
    const minutes = minutesMatch ? parseInt(minutesMatch[1], 10) : 0;
    const seconds = secondsMatch ? parseInt(secondsMatch[1], 10) : 0;
    const timeInSeconds = (minutes * 60) + seconds;
    return timeInSeconds;
  }

  const generateTradeHash = (trade: Partial<Trade>): string => {
    const hashString = `${trade.userId}-${trade.accountNumber}-${trade.instrument}-${trade.entryDate}-${trade.closeDate}-${trade.quantity}-${trade.entryId}-${trade.closeId}-${trade.timeInPosition}`
    return hashString
  }


export default function TradovateProcessor({ headers, csvData, setProcessedTrades }: TradovateProcessorProps) {
    const [trades, setTrades] = useState<Trade[]>([])

    const newMappings: { [key: string]: string } = {
        "symbol": "instrument",
        "qty": "quantity",
        "pnl": "pnl",
        "duration": "timeInPosition",
        "buyFillId": "entryId",
        "buyPrice": "entryPrice",
        "boughtTimestamp": "entryDate",
        "sellFillId": "closeId",
        "sellPrice": "closePrice",
        "soldTimestamp": "closeDate",
    }

    const processTrades = useCallback(() => {
        const newTrades: Trade[] = [];
        //TODO: Ask user for account number using account selection component
        const accountNumber = 'default-account';

        csvData.forEach(row => {
            const item: Partial<Trade> = {};
            let quantity = 0;
            headers.forEach((header, index) => {
              if (newMappings[header]) {
                const key = newMappings[header] as keyof Trade;
                const cellValue = row[index];
                switch (key) {
                  case 'quantity':
                    quantity = parseFloat(cellValue) || 0;
                    item[key] = quantity;
                    break;
                  case 'pnl':
                    const { pnl, error } = formatPnl(cellValue)
                    if (error) {
                      return
                    }
                    item[key] = pnl
                    break;
                  case 'timeInPosition':
                    item[key] = convertTimeInPosition(cellValue);
                    break;
                  default:
                    item[key] = cellValue as any;
                }
              }
            });

            if (item.instrument==''){
              return
            }

            // Default commissions for tradeovate are 1.94 for ZN and 2.08 for ZB
            // Instrument are only first 2 characters of the symbol
            if (item.instrument) {
              item.instrument = item.instrument.slice(0, 2)
            }
            if (item.instrument === 'ZN') {
              item.commission = 1.94 * item.quantity!
            } else if (item.instrument === 'ZB') {
              item.commission = 2.08 * item.quantity!
            }
              // If entryDate is after closeDate (which is buy and sell on tradovate then it means it is short)
              if (item.entryDate && item.closeDate && new Date(item.entryDate) > new Date(item.closeDate)) {
                item.side = 'short'
              }else{
                item.side = 'long'
              }

            if (!item.accountNumber) {
              item.accountNumber = accountNumber;
            }
            item.id = generateTradeHash(item as Trade).toString();
            newTrades.push(item as Trade);
          })

        setTrades(newTrades);
        setProcessedTrades(newTrades);
    }, [csvData, headers, setProcessedTrades]);

    useEffect(() => {
        processTrades();
    }, [processTrades]);

    const totalPnL = useMemo(() => trades.reduce((sum, trade) => sum + (trade.pnl || 0), 0), [trades]);
    const totalCommission = useMemo(() => trades.reduce((sum, trade) => sum + (trade.commission || 0), 0), [trades]);
    const uniqueInstruments = useMemo(() => Array.from(new Set(trades.map(trade => trade.instrument))), [trades]);

    return (
        <div className="space-y-4">
            <div>
                <h3 className="text-lg font-semibold mb-2">Processed Trades</h3>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Instrument</TableHead>
                            <TableHead>Side</TableHead>
                            <TableHead>Quantity</TableHead>
                            <TableHead>Entry Price</TableHead>
                            <TableHead>Close Price</TableHead>
                            <TableHead>Entry Date</TableHead>
                            <TableHead>Close Date</TableHead>
                            <TableHead>PnL</TableHead>
                            <TableHead>Time in Position</TableHead>
                            <TableHead>Commission</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {trades.map((trade) => (
                            <TableRow key={trade.id}>
                                <TableCell>{trade.instrument}</TableCell>
                                <TableCell>{trade.side}</TableCell>
                                <TableCell>{trade.quantity}</TableCell>
                                <TableCell>{trade.entryPrice}</TableCell>
                                <TableCell>{trade.closePrice || '-'}</TableCell>
                                <TableCell>{new Date(trade.entryDate).toLocaleString()}</TableCell>
                                <TableCell>{trade.closeDate ? new Date(trade.closeDate).toLocaleString() : '-'}</TableCell>
                                <TableCell>{trade.pnl?.toFixed(2)}</TableCell>
                                <TableCell>{`${Math.floor((trade.timeInPosition || 0) / 60)}m ${Math.floor((trade.timeInPosition || 0) % 60)}s`}</TableCell>
                                <TableCell>{trade.commission?.toFixed(2)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
            <div className="flex justify-between">
                <div>
                    <h3 className="text-lg font-semibold mb-2">Total PnL</h3>
                    <p className={`text-xl font-bold ${totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {totalPnL.toFixed(2)}
                    </p>
                </div>
                <div>
                    <h3 className="text-lg font-semibold mb-2">Total Commission</h3>
                    <p className="text-xl font-bold text-blue-600">
                        {totalCommission.toFixed(2)}
                    </p>
                </div>
            </div>
            <div>
                <h3 className="text-lg font-semibold mb-2">Instruments Traded</h3>
                <div className="flex flex-wrap gap-2">
                    {uniqueInstruments.map((instrument) => (
                        <Button
                            key={instrument}
                            variant="outline"
                            onClick={() => toast({
                                title: "Instrument Information",
                                description: `You traded ${instrument}. For more details, please check the trades table.`
                            })}
                        >
                            {instrument}
                        </Button>
                    ))}
                </div>
            </div>
        </div>
    )
}