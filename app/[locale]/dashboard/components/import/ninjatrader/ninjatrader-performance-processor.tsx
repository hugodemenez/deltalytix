'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Trade } from '@/prisma/generated/prisma/browser'
import { generateTradeHash } from '@/lib/utils'
import { PlatformProcessorProps } from '../config/platforms'
import { formatCurrencyValue, formatPriceValue } from '@/lib/ninjatrader-number-parser'
import { ProcessedTradesPreview } from '../components/processed-trades-preview'

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

      // NinjaTrader "Profit" is net PnL for the trade (same basis as "Cum. net profit" step).
      // Commission is a separate column; do not add it — that was inflating PnL to MAE/MFE-sized values.

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

  return (
    <ProcessedTradesPreview
      trades={trades}
      title="Processed Trades NinjaTrader"
    />
  )
}