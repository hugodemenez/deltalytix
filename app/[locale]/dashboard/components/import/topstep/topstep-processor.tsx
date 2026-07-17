import React, { useEffect, useCallback } from 'react'
import { Trade } from '@/prisma/generated/prisma/client'
import { PlatformProcessorProps } from '../config/platforms'
import { ProcessedTradesPreview } from '../components/processed-trades-preview'

const mappings: { [key: string]: string } = {
    "ContractName": "instrument",
    "Size": "quantity",
    "PnL": "pnl",
    "Fees": "commission",
    "Type": "side",
    "Id": "entryId",
    "EntryPrice": "entryPrice",
    "EnteredAt": "entryDate",
    "ExitPrice": "closePrice",
    "ExitedAt": "closeDate",
}

export default function TopstepProcessor({ headers, csvData, processedTrades, setProcessedTrades }: PlatformProcessorProps) {
    const processTrades = useCallback(() => {
        const newTrades: Trade[] = [];

        csvData.forEach(row => {
            const item: Partial<Trade> = {};
            let quantity = 0;
            let isValidTrade = true;

            headers.forEach((header, index) => {
                const mappingKey = Object.keys(mappings).find(key => header.includes(key));
                if (mappingKey) {
                    const key = mappings[mappingKey] as keyof Trade;
                    const cellValue = row[index];

                    // Skip trades with undefined values for required fields
                    if (!cellValue && ['instrument', 'quantity', 'entryPrice', 'closePrice', 'entryDate', 'closeDate'].includes(key)) {
                        isValidTrade = false;
                        return;
                    }

                    switch (key) {
                        case 'quantity':
                            quantity = parseFloat(cellValue) || 0;
                            if (quantity <= 0) {
                                isValidTrade = false;
                                return;
                            }
                            item[key] = quantity;
                            break;
                        case 'pnl':
                            const pnl = parseFloat(cellValue);
                            if (isNaN(pnl)) {
                                isValidTrade = false;
                                return;
                            }
                            item[key] = pnl;
                            break;
                        case 'commission':
                            const commission = parseFloat(cellValue) || 0;
                            if (commission < 0) {
                                isValidTrade = false;
                                return;
                            }
                            item[key] = commission;
                            break;
                        case 'side':
                            if (!cellValue) {
                                isValidTrade = false;
                                return;
                            }
                            item[key] = cellValue.toLowerCase();
                            break;
                        case 'entryPrice':
                        case 'closePrice':
                            const price = parseFloat(cellValue);
                            if (isNaN(price) || price <= 0) {
                                isValidTrade = false;
                                return;
                            }
                            item[key] = price.toString();
                            break;
                        case 'instrument':
                            if (!cellValue) {
                                isValidTrade = false;
                                return;
                            }
                            item[key] = cellValue.slice(0, -2);
                            break;
                        default:
                            item[key] = cellValue as any;
                    }
                }
            });

            // Process dates - input dates already include timezone info
            try {
                if (item.entryDate) {
                    const date = new Date(item.entryDate);
                    if (isNaN(date.getTime())) {
                        isValidTrade = false;
                        return;
                    }
                    
                    // The date is already in UTC when parsed from a string with timezone info
                    item.entryDate = date.toISOString().replace('Z', '+00:00');
                }

                if (item.closeDate) {
                    const date = new Date(item.closeDate);
                    if (isNaN(date.getTime())) {
                        isValidTrade = false;
                        return;
                    }
                    
                    // The date is already in UTC when parsed from a string with timezone info
                    item.closeDate = date.toISOString().replace('Z', '+00:00');
                }
            } catch (e) {
                isValidTrade = false;
                return;
            }

            // Calculate time in position in seconds using UTC timestamps
            if (item.entryDate && item.closeDate) {
                const entryTime = new Date(item.entryDate).getTime();
                const closeTime = new Date(item.closeDate).getTime();
                item.timeInPosition = Math.round((closeTime - entryTime) / 1000);
            } else {
                isValidTrade = false;
                return;
            }

            // Create a unique temp ID to use it as key in our table
            item.id = `${item.instrument}-${item.entryId}-${item.closeId}-${item.quantity}`

            // Only add valid trades
            if (isValidTrade) {
                newTrades.push(item as Trade);
            }
        });

        setProcessedTrades(newTrades);
    }, [csvData, headers, setProcessedTrades]);

    useEffect(() => {
        processTrades();
    }, [processTrades]);

    return <ProcessedTradesPreview trades={processedTrades} />
} 