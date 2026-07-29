'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Trade } from '@/prisma/generated/prisma/browser'
import { PlatformProcessorProps } from '../config/platforms'
import { generateTradeHash } from '@/lib/utils'
import { ProcessedTradesPreview } from '../components/processed-trades-preview'

const newMappings: { [key: string]: string } = {
  "Account Name": "accountNumber",
  "Close Date": "closeDate",
  "Close Time": "closeTime",
  "Commission": "commission",
  "Duration": "timeInPosition",
  "Entry Price": "entryPrice",
  "Open Date": "entryDate",
  "Open Time": "entryTime",
  "Exit Price": "closePrice",
  "Fee": "commission",
  "Gross P&L": "pnl",
  "Instrument": "instrument",
  "Quantity": "quantity",
  "Side": "side",
  "Symbol": "instrument",
  "Adjusted Cost": "entryId",
  "Adjusted Proceeds": "closeId",
}

export default function TradezellaProcessor({ headers, csvData, setProcessedTrades }: PlatformProcessorProps) {
  const [trades, setTrades] = useState<Trade[]>([])

  const processTrades = useCallback(() => {
    const newTrades: Trade[] = [];
    const accountNumber = 'default-account';

    csvData.forEach((row, rowIndex) => {
      const item: Partial<Trade> = {};
      let entryTime = '';
      let closeTime = '';
      headers.forEach((header, index) => {
        if (newMappings[header]) {
          const key = newMappings[header];
          const cellValue = row[index];
          switch (key) {
            case 'entryTime':
              entryTime = cellValue as any;
              break;
            case 'closeTime':
              closeTime = cellValue as any;
              break;
            case 'pnl':
              item.pnl = parseFloat(cellValue)
              break;
            case 'commission':
              item.commission = parseFloat(cellValue)
              break;
            case 'quantity':
              item.quantity = parseFloat(cellValue)
              break;
            case 'timeInPosition':
              item.timeInPosition = parseFloat(cellValue)
              break;
            default:
              item[key as keyof Trade] = cellValue as any;
          }
        }
      });
      if (Object.values(item).some(value => value === undefined)) {
        return
      }

      if (entryTime && closeTime) {
        item.entryDate = new Date(`${item.entryDate} ${entryTime.slice(0, 8)}`).toISOString();
        item.closeDate = new Date(`${item.closeDate} ${closeTime.slice(0, 8)}`).toISOString();
      }

      item.accountNumber = item.accountNumber || accountNumber;
      item.id = generateTradeHash({
        ...item,
        entryId: `${item.entryId || ''}-${rowIndex}`,
      }).toString();

      newTrades.push(item as Trade);
    })

    setTrades(newTrades);
    setProcessedTrades(newTrades);
  }, [csvData, headers, setProcessedTrades]);

  useEffect(() => {
    processTrades();
  }, [processTrades]);

  return <ProcessedTradesPreview trades={trades} />
}
