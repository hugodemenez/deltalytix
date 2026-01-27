'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Trade } from '@/prisma/generated/prisma/browser'
import { generateTradeHash } from '@/lib/utils'
import { PlatformProcessorProps } from '../config/platforms'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"


/**
 * Formats currency values from NinjaTrader CSV exports
 * Supports multiple formats:
 * - Negative values in parenthesis: ($400.00), (400.00)
 * - Standard negative: -$400.00, -400.00
 * - Positive values: $400.00, 400.00
 * - US format with thousand separators: $1,234.56
 * - European format with comma as decimal: 1234,56 or 1.234,56
 */
const formatCurrencyValue = (pnl: string | undefined): { pnl: number, error?: string } => {
  if (typeof pnl !== 'string' || pnl.trim() === '') {
    return { pnl: 0, error: 'Invalid PNL value' };
  }

  const formattedPnl = pnl.trim();
  
  // Check if value is in parenthesis format (negative)
  const isNegative = formattedPnl.startsWith('(') && formattedPnl.endsWith(')');
  
  // Remove parentheses and dollar signs
  let cleanedValue = formattedPnl.replace(/[()$]/g, '');
  
  // Detect format: if there's both comma and period, determine which is decimal separator
  if (cleanedValue.includes(',') && cleanedValue.includes('.')) {
    // If comma comes before period, it's a thousand separator (US format: 1,234.56)
    // If period comes before comma, it's European format (1.234,56)
    const commaIndex = cleanedValue.indexOf(',');
    const periodIndex = cleanedValue.indexOf('.');
    
    if (commaIndex < periodIndex) {
      // US format: remove commas (thousand separators)
      cleanedValue = cleanedValue.replace(/,/g, '');
    } else {
      // European format: remove periods (thousand separators) and replace comma with period
      cleanedValue = cleanedValue.replace(/\./g, '').replace(',', '.');
    }
  } else if (cleanedValue.includes(',')) {
    // Only comma present - could be either format
    // European decimal format has 1+ digits after comma (e.g., 123,45 or 123,4567)
    // US thousand separator has exactly 3 digits between each comma (e.g., 1,234 or 1,234,567)
    const parts = cleanedValue.split(',');
    
    // Check if it matches US thousand separator pattern:
    // - Multiple commas: all parts after first must be exactly 3 digits
    // - Single comma with exactly 3 digits after
    let isUSFormat = false;
    if (parts.length === 2 && parts[1].length === 3) {
      // Single comma with exactly 3 digits after (e.g., 1,234)
      isUSFormat = true;
    } else if (parts.length > 2) {
      // Multiple commas: verify all parts except first are exactly 3 digits
      isUSFormat = parts.slice(1).every(part => part.length === 3);
    }
    
    if (isUSFormat) {
      // US thousand separator format (e.g., 1,234 or 1,234,567)
      cleanedValue = cleanedValue.replace(/,/g, '');
    } else {
      // European decimal format (e.g., 123,45 or 1,2 or 123,4567)
      cleanedValue = cleanedValue.replace(',', '.');
    }
  }
  
  const numericValue = parseFloat(cleanedValue);
  
  if (isNaN(numericValue)) {
    return { pnl: 0, error: 'Unable to parse PNL value' };
  }
  
  return { pnl: isNegative ? -numericValue : numericValue };
};

const formatPriceValue = (price: string | undefined): { price: number, error?: string } => {
  if (typeof price !== 'string' || price.trim() === '') {
    return { price: 0, error: 'Invalid price value' };
  }

  const formattedPrice = price.trim();
  const numericValue = parseFloat(formattedPrice.replace(',', '.'));
  
  if (isNaN(numericValue)) {
    return { price: 0, error: 'Unable to parse price value' };
  }
  return { price: numericValue };
};

const convertToValidDate = (dateString: string): Date | null => {
  if (!dateString) return null;

  // Try MM/DD/YYYY HH:MM:SS AM/PM format (US format with seconds and AM/PM)
  const usFormatWithSeconds = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s(\d{1,2}):(\d{2}):(\d{2})\s(AM|PM)$/i;
  const matchUSWithSeconds = dateString.match(usFormatWithSeconds);
  
  if (matchUSWithSeconds) {
    const [, month, day, year, hours, minutes, seconds, ampm] = matchUSWithSeconds;
    let hour24 = parseInt(hours);
    if (ampm.toUpperCase() === 'PM' && hour24 !== 12) {
      hour24 += 12;
    } else if (ampm.toUpperCase() === 'AM' && hour24 === 12) {
      hour24 = 0;
    }
    const localDate = new Date(
      parseInt(year),
      parseInt(month) - 1, // months are 0-based
      parseInt(day),
      hour24,
      parseInt(minutes),
      parseInt(seconds)
    );
    return isNaN(localDate.getTime()) ? null : localDate;
  }

  // Try MM/DD/YYYY HH:MM AM/PM format (US format without seconds)
  const usFormatWithoutSeconds = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s(\d{1,2}):(\d{2})\s(AM|PM)$/i;
  const matchUSWithoutSeconds = dateString.match(usFormatWithoutSeconds);
  
  if (matchUSWithoutSeconds) {
    const [, month, day, year, hours, minutes, ampm] = matchUSWithoutSeconds;
    let hour24 = parseInt(hours);
    if (ampm.toUpperCase() === 'PM' && hour24 !== 12) {
      hour24 += 12;
    } else if (ampm.toUpperCase() === 'AM' && hour24 === 12) {
      hour24 = 0;
    }
    const localDate = new Date(
      parseInt(year),
      parseInt(month) - 1, // months are 0-based
      parseInt(day),
      hour24,
      parseInt(minutes),
      0 // default seconds to 0
    );
    return isNaN(localDate.getTime()) ? null : localDate;
  }

  // Try DD/MM/YYYY HH:MM:SS format (European format with seconds)
  const dateRegexWithSeconds = /^(\d{2})\/(\d{2})\/(\d{4})\s(\d{2}):(\d{2}):(\d{2})$/;
  const matchWithSeconds = dateString.match(dateRegexWithSeconds);
  
  if (matchWithSeconds) {
    const [, day, month, year, hours, minutes, seconds] = matchWithSeconds;
    // Create date in local timezone
    const localDate = new Date(
      parseInt(year),
      parseInt(month) - 1, // months are 0-based
      parseInt(day),
      parseInt(hours),
      parseInt(minutes),
      parseInt(seconds)
    );
    return isNaN(localDate.getTime()) ? null : localDate;
  }

  // Try DD/MM/YYYY HH:MM format (European format without seconds)
  const dateRegexWithoutSeconds = /^(\d{2})\/(\d{2})\/(\d{4})\s(\d{2}):(\d{2})$/;
  const matchWithoutSeconds = dateString.match(dateRegexWithoutSeconds);
  
  if (matchWithoutSeconds) {
    const [, day, month, year, hours, minutes] = matchWithoutSeconds;
    // Create date in local timezone
    const localDate = new Date(
      parseInt(year),
      parseInt(month) - 1, // months are 0-based
      parseInt(day),
      parseInt(hours),
      parseInt(minutes),
      0 // default seconds to 0
    );
    return isNaN(localDate.getTime()) ? null : localDate;
  }

  // If none of the formats match, return null
  return null;
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

export default function NinjaTraderPerformanceProcessor({ headers, csvData, setProcessedTrades }: PlatformProcessorProps) {
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
              const { pnl, error } = formatCurrencyValue(cellValue);
              // Don't skip the trade if PnL is missing, just default to 0
              item[key] = error ? 0 : pnl;
              break;
            case 'commission':
              const { pnl: commission, error: commissionError } = formatCurrencyValue(cellValue);
              // Don't skip the trade if commission is missing, just default to 0
              item[key] = commissionError ? 0 : commission;
              break;
            case 'side':
              item[key] = cellValue.toLowerCase();
              break;
              case 'instrument':
                if (typeof cellValue === 'string' && cellValue.trim() !== '') {
                  item[key] = cellValue.split(' ')[0];
                } else {
                  item[key] = '';
                }
                break;
            default:
              item[key] = cellValue as any;
          }
        }
      });

      if (!hasValidData || !item.instrument) {
        return;
      }

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
    <Card className="h-full flex flex-col w-full overflow-x-scroll">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b shrink-0 p-3 sm:p-4 h-[56px]">
        <CardTitle className="line-clamp-1 text-base">
          Processed Trades NinjaTrader
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 overflow-auto p-0">
        <div className="flex h-full flex-col min-w-fit">
          <Table className="w-full h-full border-separate border-spacing-0">
            <TableHeader className="sticky top-0 z-10 bg-muted/90 backdrop-blur-xs shadow-xs border-b">
              <TableRow>
                <TableHead className="whitespace-nowrap px-3 py-2 text-left text-sm font-semibold bg-muted/90 border-r border-border last:border-r-0 first:border-l">
                  Account
                </TableHead>
                <TableHead className="whitespace-nowrap px-3 py-2 text-left text-sm font-semibold bg-muted/90 border-r border-border last:border-r-0 first:border-l">
                  Instrument
                </TableHead>
                <TableHead className="whitespace-nowrap px-3 py-2 text-left text-sm font-semibold bg-muted/90 border-r border-border last:border-r-0 first:border-l">
                  Side
                </TableHead>
                <TableHead className="whitespace-nowrap px-3 py-2 text-left text-sm font-semibold bg-muted/90 border-r border-border last:border-r-0 first:border-l">
                  Quantity
                </TableHead>
                <TableHead className="whitespace-nowrap px-3 py-2 text-left text-sm font-semibold bg-muted/90 border-r border-border last:border-r-0 first:border-l">
                  Entry Price
                </TableHead>
                <TableHead className="whitespace-nowrap px-3 py-2 text-left text-sm font-semibold bg-muted/90 border-r border-border last:border-r-0 first:border-l">
                  Close Price
                </TableHead>
                <TableHead className="whitespace-nowrap px-3 py-2 text-left text-sm font-semibold bg-muted/90 border-r border-border last:border-r-0 first:border-l">
                  Entry Date
                </TableHead>
                <TableHead className="whitespace-nowrap px-3 py-2 text-left text-sm font-semibold bg-muted/90 border-r border-border last:border-r-0 first:border-l">
                  Close Date
                </TableHead>
                <TableHead className="whitespace-nowrap px-3 py-2 text-left text-sm font-semibold bg-muted/90 border-r border-border last:border-r-0 first:border-l">
                  PnL
                </TableHead>
                <TableHead className="whitespace-nowrap px-3 py-2 text-left text-sm font-semibold bg-muted/90 border-r border-border last:border-r-0 first:border-l">
                  Time in Position
                </TableHead>
                <TableHead className="whitespace-nowrap px-3 py-2 text-left text-sm font-semibold bg-muted/90 border-r border-border last:border-r-0 first:border-l">
                  Commission
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="flex-1 overflow-auto bg-background">
              {trades.length > 0 ? (
                trades.map((trade) => (
                  <TableRow
                    key={trade.id}
                    className="border-b border-border transition-all duration-75 hover:bg-muted/40"
                  >
                    <TableCell className="whitespace-nowrap px-3 py-2 text-sm border-r border-border/50 last:border-r-0 first:border-l">
                      {trade.accountNumber}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-2 text-sm border-r border-border/50 last:border-r-0 first:border-l">
                      {trade.instrument}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-2 text-sm border-r border-border/50 last:border-r-0 first:border-l">
                      {trade.side}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-2 text-sm border-r border-border/50 last:border-r-0 first:border-l">
                      {trade.quantity}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-2 text-sm border-r border-border/50 last:border-r-0 first:border-l">
                      {trade.entryPrice}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-2 text-sm border-r border-border/50 last:border-r-0 first:border-l">
                      {trade.closePrice || '-'}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-2 text-sm border-r border-border/50 last:border-r-0 first:border-l">
                      {new Date(trade.entryDate).toLocaleString()}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-2 text-sm border-r border-border/50 last:border-r-0 first:border-l">
                      {trade.closeDate ? new Date(trade.closeDate).toLocaleString() : '-'}
                    </TableCell>
                    <TableCell className={`whitespace-nowrap px-3 py-2 text-sm border-r border-border/50 last:border-r-0 first:border-l ${trade.pnl && trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {trade.pnl?.toFixed(2)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-2 text-sm border-r border-border/50 last:border-r-0 first:border-l">
                      {`${Math.floor((trade.timeInPosition || 0) / 60)}m ${Math.floor((trade.timeInPosition || 0) % 60)}s`}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-2 text-sm border-r border-border/50 last:border-r-0 first:border-l">
                      {trade.commission?.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    className="h-24 text-center"
                  >
                    No trades found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-between border-t bg-background px-4 py-3 shrink-0">
        <div className="flex items-center gap-6">
          <div>
            <h3 className="text-sm font-semibold mb-1">Total PnL</h3>
            <p className={`text-lg font-bold ${totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${totalPnL.toFixed(2)}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-1">Total Commission</h3>
            <p className="text-lg font-bold text-blue-600">
              ${totalCommission.toFixed(2)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Instruments:</h3>
          <div className="flex flex-wrap gap-2">
            {uniqueInstruments.map((instrument) => (
              <Button
                key={instrument}
                variant="outline"
                size="sm"
              >
                {instrument}
              </Button>
            ))}
          </div>
        </div>
      </CardFooter>
    </Card>
  )
}