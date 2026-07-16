'use client'

import React, { useEffect, useCallback } from 'react'
import { toast } from "sonner"
import { Trade } from '@/prisma/generated/prisma/browser'
import { PlatformProcessorProps } from '../config/platforms'
import { ProcessedTradesPreview } from '../components/processed-trades-preview'

const newMappings: { [key: string]: string } = {
    "AccountNumber": "accountNumber",
    "Instrument": "instrument",
    "Fill Size": "quantity",
    "Trade P&L": "pnl",
    "Trade Life Span": "timeInPosition",
    "Commission & Fees": "commission",
    "Entry Buy/Sell": "side",
    "Entry Order Number": "entryId",
    "Entry Price": "entryPrice",
    "Entry Time": "entryDate",
    "Exit Order Number": "closeId",
    "Exit Price": "closePrice",
    "Exit Time": "closeDate",
}

export default function RithmicPerformanceProcessor({ headers, csvData, processedTrades, setProcessedTrades }: PlatformProcessorProps) {

    const processTrades = useCallback(() => {
        const newTrades: Trade[] = [];
        const accountNumber = 'default-account'; // Replace with actual account number

        csvData.forEach(row => {
            const item: Partial<Trade> = {};
            let quantity = 0;
            headers.forEach((header, index) => {
                const mappingKey = Object.keys(newMappings).find(key => header.includes(key));
                if (mappingKey) {
                    const key = newMappings[mappingKey] as keyof Trade;
                    const cellValue = row[index];
                    switch (key) {
                        case 'quantity':
                            quantity = parseFloat(cellValue) || 0;
                            item[key] = quantity;
                            break;
                        case 'pnl':
                            const pnl = parseFloat(cellValue) || 0;
                            item[key] = pnl;
                            break;
                        case 'commission':
                            item[key] = parseFloat(cellValue) || 0;
                            break;
                        case 'timeInPosition':
                            item[key] = parseFloat(cellValue) || 0;
                            break;
                        default:
                            item[key] = cellValue as any;
                    }
                }
            });

            // Ensure time values are stored as ISO strings
            try {
                if (item.entryDate) {
                    item.entryDate = new Date(item.entryDate).toISOString();
                }
                if (item.closeDate) {
                    item.closeDate = new Date(item.closeDate).toISOString();
                }
            } catch (e) {
                toast.error("Error", {
                    description: "There was an error processing the trades. Please check the data and try again."
                })
                return;
            }
            // On rithmic performance, the side is stored as 'B' or 'S'
            if (item.side === 'B' || item.side === 'S') {
                item.side = item.side === 'B' ? 'Long' : 'Short';
            }

            if (item.instrument) {
                item.instrument = item.instrument.slice(0, -2)
            }
            // This is going to be set later
            item.userId = ''
            if (!item.accountNumber) {
                item.accountNumber = accountNumber;
            }
            item.id = `${item.entryId}-${item.closeId}`;
            newTrades.push(item as Trade);
        });

        setProcessedTrades(newTrades);
    }, [csvData, headers, setProcessedTrades]);

    useEffect(() => {
        processTrades();
    }, [processTrades]);

    return <ProcessedTradesPreview trades={processedTrades} />
}