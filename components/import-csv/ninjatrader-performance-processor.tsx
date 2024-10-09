'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { toast } from '@/hooks/use-toast'
import { Trade } from '@prisma/client'
import { getDomainOfItemsWithSameAxis } from 'recharts/types/util/ChartUtils'

interface NinjaTraderPerformanceProcessorProps {
  headers: string[];
  csvData: string[][];
  setProcessedTrades: React.Dispatch<React.SetStateAction<Trade[]>>;
}

/**
* Converts a profit and loss string to a numeric value
* @example
* parsePnl('$12,345.67')
* { pnl: 12345.67 }
* @param {string | undefined} pnl - The profit and loss value as a string (e.g. "$1,234.56").
* @returns {{ pnl: number, error?: string }} An object with the numeric value and an optional error message.
* @description
*   - The function trims input and removes dollar signs and converts commas to dots for parsing as a float.
*   - It returns an error object with 'pnl' set to 0 if parsing fails.
*   - Warning messages are logged to the console for invalid or unparsable inputs.
*   - This is used for processing CSV fields from NinjaTrader performance reports.
*/
const formatCurrencyValue = (pnl: string | undefined): { pnl: number, error?: string } => {
  if (typeof pnl !== 'string' || pnl.trim() === '') {
    console.warn('Invalid PNL value:', pnl);
    return { pnl: 0, error: 'Invalid PNL value' };
  }

  let formattedPnl = pnl.trim();

  // Remove , by . and $ by nothing
  const numericValue = parseFloat(formattedPnl.replace(/[$]/g, '').replace(',', '.'));
  if (isNaN(numericValue)) {
    console.warn('Unable to parse PNL value:', pnl);
    return { pnl: 0, error: 'Unable to parse PNL value' };
  }
  return { pnl: numericValue };
};


const generateTradeHash = (trade: Partial<Trade>, index: number): string => {
  const hashString = `${trade.accountNumber}-${trade.instrument}-${trade.entryDate}-${trade.closeDate}-${trade.quantity}-${trade.entryId}-${trade.closeId}-${trade.timeInPosition}-${index}`
  return hashString
}


/**
 * Processes NinjaTrader CSV export to display trade performance
 * @example
 * NinjaTraderPerformanceProcessor({
 *   headers: ["Instrument", "Entry time", "Exit time", "Profit"],
 *   csvData: [
 *     ["ES 06-21", "10/05/2021 14:55:00", "10/05/2021 15:34:00", "$500"],
 *     ["NQ 06-21", "11/05/2021 09:15:00", "11/05/2021 12:48:00", "$750"]
 *   ],
 *   setProcessedTrades: (trades) => console.log(trades)
 * })
 * // Expected return would be the component rendering the processed trades table
 * @param {NinjaTraderPerformanceProcessorProps} props - Object containing headers, CSV data, and a setter for processed trades.
 * @returns {JSX.Element} JSX element rendering the trade processing results.
 * @description
 *   - Assumes the availability of a 'formatCurrencyValue' function for parsing currency strings.
 *   - Expects dates in the CSV data to be in the format DD/MM/YYYY HH:mm:ss or parseable by JavaScript's `new Date`.
 *   - The component localizes dates and assumes UTC when parsing them from the CSV format.
 *   - The basic structure of CSV data is not validated comprehensively (e.g., headers match expected ones).
 */
export default function NinjaTraderPerformanceProcessor({ headers, csvData, setProcessedTrades }: NinjaTraderPerformanceProcessorProps) {
  const [trades, setTrades] = useState<Trade[]>([])
  const newMappings: { [key: string]: string } = {
    "Account": "accountNumber",
    "Commission": "commission",
    "Entry name": "entryId",
    "Entry price": "entryPrice",
    "Entry time": "entryDate",
    "Exit name": "closeId",
    "Exit price": "closePrice",
    "Exit time": "closeDate",
    "Instrument": "instrument",
    "Market pos.": "side",
    "Profit": "pnl",
    "Qty": "quantity"
  }

  const processTrades = useCallback(() => {
    const newTrades: Trade[] = [];
    //TODO: Ask user for account number using account selection component
    csvData.forEach((row, index) => {
      if (row.length < 3) {
        return
      }
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
              const { pnl, error } = formatCurrencyValue(cellValue)
              if (error) {
                return
              }
              item[key] = pnl
              break;
            case 'commission':
              const { pnl: commission, error: commissionError } = formatCurrencyValue(cellValue) || 0;
              if (commissionError) {
                return
              }
              item[key] = commission
              break;
            case 'side':
              item[key] = cellValue.toLowerCase()
              break;
            default:
              item[key] = cellValue as any;
          }
        }
      });

      if (item.instrument === '') {
        return;
      }

      /**
      * Converts a string representation of a date to a Date object
      * @example
      * parseDate('25/12/2020 15:30:00')
      * new Date('2020-12-25T15:30:00.000Z')
      * @param {string} dateString - String representing a date in DD/MM/YYYY HH:mm:ss format.
      * @returns {Date | null} The corresponding Date object or null if string cannot be parsed.
      * @description
      *   - The function returns null if dateString is invalid or not in the expected format.
      *   - TimeZone is assumed to be UTC when converting to Date object.
      */
      const convertToValidDate = (dateString: string): Date | null => {
        // Check if the date is in the format DD/MM/YYYY HH:mm:ss
        const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})\s(\d{2}):(\d{2}):(\d{2})$/;
        const match = dateString.match(dateRegex);

        if (match) {
          // If it matches, convert to YYYY-MM-DDTHH:mm:ss.000Z format
          const [, day, month, year, hours, minutes, seconds] = match;
          return new Date(`${year}-${month}-${day}T${hours}:${minutes}:${seconds}.000Z`);
        } else {
          // If it doesn't match, try parsing it directly
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
        console.error('Invalid date format:', { entryDate: item.entryDate, closeDate: item.closeDate });
        return; // Skip this trade if dates are invalid
      }

      console.log("Entry Date", item.entryDate)
      console.log("Close Date", item.closeDate)

      // Compute time in position based on entry and close date
      if (item.entryDate && item.closeDate) {
        item.timeInPosition = (new Date(item.closeDate).getTime() - new Date(item.entryDate).getTime()) / 1000
      }

      // Instrument are only first 2 characters of the symbol
      if (item.instrument) {
        item.instrument = item.instrument.slice(0, 2)
      }

      // Add commission to pnl because pnl is net profit
      if (item.pnl !== undefined && item.commission !== undefined) {
        item.pnl = item.pnl + item.commission;
      }

      item.id = generateTradeHash(item as Trade, index).toString();
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