'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { toast } from '@/hooks/use-toast'
import { Trade } from '@prisma/client'
import { generateTradeHash } from '@/lib/utils'

interface NinjaTraderPerformanceProcessorProps {
  headers: string[];
  csvData: string[][];
  setProcessedTrades: React.Dispatch<React.SetStateAction<Trade[]>>;
}

const formatCurrencyValue = (pnl: string | undefined): { pnl: number, error?: string } => {
  if (typeof pnl !== 'string' || pnl.trim() === '') {
    return { pnl: 0, error: 'Invalid PNL value' };
  }

  let formattedPnl = pnl.trim();
  const numericValue = parseFloat(formattedPnl.replace(/[$]/g, '').replace(',', '.'));
  
  if (isNaN(numericValue)) {
    return { pnl: 0, error: 'Unable to parse PNL value' };
  }
  return { pnl: numericValue };
};

const formatPriceValue = (price: string | undefined): { price: number, error?: string } => {
  if (typeof price !== 'string' || price.trim() === '') {
    return { price: 0, error: 'Invalid price value' };
  }

  let formattedPrice = price.trim();
  const numericValue = parseFloat(formattedPrice.replace(',', '.'));
  
  if (isNaN(numericValue)) {
    return { price: 0, error: 'Unable to parse price value' };
  }
  return { price: numericValue };
};

const englishMappings: { [key: string]: string } = {
  "Account": "accountNumber",
  "Entry name": "entryId",
  "Entry price": "entryPrice",
  "Entry time": "entryDate",
  "Exit name": "closeId",
  "Exit price": "closePrice",
  "Exit time": "closeDate",
  "Instrument": "instrument",
  "Market pos.": "side",
  "Profit": "pnl",
  "Qty": "quantity",
  "Commission": "commission",
}

const frenchMappings: { [key: string]: string } = {
  "Compte": "accountNumber",
  "Nom d'entrée": "entryId",
  "Prix d'entrée": "entryPrice",
  "Heure d'entrée": "entryDate",
  "Nom de la sortie": "closeId",
  "Prix de sortie": "closePrice",
  "Heure de sortie": "closeDate",
  "Instrument": "instrument",
  "Pos. marché.": "side",
  "Qté": "quantity",
  "Commission": "commission",
  "Profit": "pnl",
}

export default function NinjaTraderPerformanceProcessor({ headers, csvData, setProcessedTrades }: NinjaTraderPerformanceProcessorProps) {
  const [trades, setTrades] = useState<Trade[]>([])

  const processTrades = useCallback(() => {
    const newTrades: Trade[] = [];
    
    const normalizeHeader = (header: string): string => {
      return header.replace(/[\u2019''′`]/g, "'");
    };

    const isFrenchCSV = headers.some(header => 
      ["Numéro d'ordre", "Compte", "Stratégie", "Pos. marché.", "Qté"].includes(header)
    );
    
    const mappings = isFrenchCSV ? frenchMappings : englishMappings;

    csvData.forEach((row, rowIndex) => {
      if (row.length < 3 || row.every(cell => !cell)) {
        return;
      }

      const item: Partial<Trade> = {};
      let quantity = 0;
      let hasValidData = false;

      headers.forEach((header, index) => {
        const normalizedHeader = normalizeHeader(header);
        const mappedKey = mappings[normalizedHeader];
        if (mappedKey) {
          const key = mappedKey as keyof Trade;
          const cellValue = row[index]?.trim();
          
          if (!cellValue) {
            return;
          }

          hasValidData = true;
          
          switch (key) {
            case 'quantity':
              quantity = parseFloat(cellValue) || 0;
              item[key] = quantity;
              break;
            case 'entryPrice':
              const { price: entryPrice, error: entryPriceError } = formatPriceValue(cellValue);
              if (entryPriceError) {
                return; // Entry price is required
              }
              item[key] = entryPrice.toString();
              break;
            case 'closePrice':
              const { price: closePrice, error: closePriceError } = formatPriceValue(cellValue);
              // Close price can be missing for open trades
              item[key] = closePriceError ? undefined : closePrice.toString();
              break;
            case 'pnl':
              const { pnl, error } = formatCurrencyValue(cellValue)
              // Don't skip the trade if PnL is missing, just default to 0
              item[key] = error ? 0 : pnl
              break;
            case 'commission':
              const { pnl: commission, error: commissionError } = formatCurrencyValue(cellValue) || 0;
              // Don't skip the trade if commission is missing, just default to 0
              item[key] = commissionError ? 0 : commission
              break;
            case 'side':
              item[key] = cellValue.toLowerCase()
              break;
            default:
              item[key] = cellValue as any;
          }
        }
      });

      if (!hasValidData || !item.instrument) {
        return;
      }

      const convertToValidDate = (dateString: string): Date | null => {
        if (!dateString) return null;

        const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})\s(\d{2}):(\d{2}):(\d{2})$/;
        const match = dateString.match(dateRegex);

        if (match) {
          const [, day, month, year, hours, minutes, seconds] = match;
          const isoString = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.000Z`;
          return new Date(isoString);
        } else {
          const date = new Date(dateString);
          return isNaN(date.getTime()) ? null : date;
        }
      };

      const entryDate = convertToValidDate(item.entryDate as string);
      const closeDate = convertToValidDate(item.closeDate as string);

      if (entryDate && closeDate) {
        item.entryDate = entryDate.toISOString();
        item.closeDate = closeDate.toISOString();
      } else {
        return;
      }

      if (item.entryDate && item.closeDate) {
        item.timeInPosition = (new Date(item.closeDate).getTime() - new Date(item.entryDate).getTime()) / 1000
      }

      if (item.instrument) {
        // Remove expiration dates (e.g., "MES 03-25" becomes "MES")
        item.instrument = item.instrument.replace(/\s+\d{2}-\d{2}$/, '')
      }

      if (item.pnl !== undefined && item.commission !== undefined) {
        item.pnl = item.pnl + item.commission;
      }

      // Add rowIndex to the trade object for unique identification
      item.id = generateTradeHash({ ...item as Trade, entryId: `${item.entryId || ''}-${rowIndex}` }).toString();
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