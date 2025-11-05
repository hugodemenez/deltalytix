'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Trade } from '@prisma/client'
import { useI18n } from '@/locales/client'
import { useTradesStore } from '@/store/trades-store'
import { generateTradeHash } from '@/lib/utils'
import { PlatformProcessorProps } from '../config/platforms'


const formatPnl = (pnl: string | undefined): { pnl: number, error?: string } => {
    if (!pnl || String(pnl).trim() === '') {
        console.warn('Invalid PNL value:', pnl);
        return { pnl: 0, error: 'Invalid PNL value' };
    }

    let formattedPnl = String(pnl).trim();

    // Remove any currency symbols and commas
    formattedPnl = formattedPnl.replace(/[$,€£]/g, '');

    const numericValue = parseFloat(formattedPnl);

    if (isNaN(numericValue)) {
        console.warn('Unable to parse PNL value:', pnl);
        return { pnl: 0, error: 'Unable to parse PNL value' };
    }

    return { pnl: numericValue };
};

const parseAtasDate = (dateValue: any): string | undefined => {
    if (!dateValue || String(dateValue).trim() === '') {
        return undefined;
    }
    
    try {
        // Check if it's an Excel serial number (numeric value)
        if (typeof dateValue === 'number') {
            // Excel serial numbers represent days since January 1, 1900
            // We need to convert this to a JavaScript Date
            const excelEpoch = new Date(1900, 0, 1); // January 1, 1900
            const millisecondsPerDay = 24 * 60 * 60 * 1000;
            
            // Excel incorrectly treats 1900 as a leap year, so we need to adjust
            // Excel's epoch is actually 1900-01-01, but it incorrectly includes 1900-02-29
            const adjustedSerialNumber = dateValue - 2; // Adjust for Excel's leap year bug
            
            const date = new Date(excelEpoch.getTime() + (adjustedSerialNumber * millisecondsPerDay));
            
            if (isNaN(date.getTime())) {
                console.error(`Invalid Excel serial number: ${dateValue}`);
                return undefined;
            }
            
            return date.toISOString().replace('Z', '+00:00');
        }
        
        // Handle string format: DD.MM.YYYY HH:MM:SS
        const dateStr = String(dateValue);
        
        // Check if it's already in ISO format
        if (dateStr.includes('T') || dateStr.includes('-')) {
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
                return date.toISOString().replace('Z', '+00:00');
            }
        }
        
        // ATAS format: DD.MM.YYYY HH:MM:SS
        const [datePart, timePart] = dateStr.split(' ');
        
        if (!datePart || !timePart) {
            console.error(`Invalid ATAS date format: ${dateStr}`);
            return undefined;
        }

        const [day, month, year] = datePart.split('.').map(Number);
        const [hours, minutes, seconds] = timePart.split(':').map(Number);

        // Validate all components
        if ([year, month, day, hours, minutes, seconds].some(n => isNaN(n))) {
            console.error(`Invalid date components:`, { year, month, day, hours, minutes, seconds });
            return undefined;
        }

        // Create date in local time (month - 1 because JS months are 0-based)
        const localDate = new Date(year, month - 1, day, hours, minutes, seconds);

        // Validate the created date
        if (isNaN(localDate.getTime())) {
            console.error(`Invalid date created:`, localDate);
            return undefined;
        }

        // Convert to UTC and format
        return localDate.toISOString().replace('Z', '+00:00');

    } catch (error) {
        console.error(`Error parsing ATAS date: ${dateValue}`, error);
        return undefined;
    }
};

// ATAS column mappings - only map fields that exist in the database schema
const atasMappings: { [key: string]: string } = {
    "Instrument": "instrument",
    "Open time": "entryDate",
    "Open price": "entryPrice",
    "Open volume": "quantity",
    "Close time": "closeDate",
    "Close price": "closePrice",
    "PnL": "pnl",
    "Comment": "comment"
}

export default function AtasProcessor({ csvData, headers, processedTrades, setProcessedTrades, accountNumbers }: PlatformProcessorProps) {
    const existingTrades = useTradesStore((state => state.trades))
    const [trades, setTrades] = useState<Trade[]>([])
    const [missingCommissions, setMissingCommissions] = useState<{ [key: string]: number }>({})
    const [showCommissionPrompt, setShowCommissionPrompt] = useState(false)
    const t = useI18n()

    const existingCommissions = useMemo(() => {
        const commissions: { [key: string]: number } = {}
        if (!accountNumbers) {
            return commissions;
        }
        existingTrades
            .filter(trade => accountNumbers.includes(trade.accountNumber))
            .forEach(trade => {
                if (trade.instrument && trade.commission && trade.quantity) {
                    commissions[trade.instrument] = trade.commission / trade.quantity
                }
            })
        return commissions
    }, [existingTrades, accountNumbers])

    const totalPnL = useMemo(() => trades.reduce((sum, trade) => sum + (trade.pnl || 0), 0), [trades]);
    const totalCommission = useMemo(() => trades.reduce((sum, trade) => sum + (trade.commission || 0), 0), [trades]);
    const uniqueInstruments = useMemo(() => Array.from(new Set(trades.map(trade => trade.instrument))), [trades]);

    const processTrades = useCallback(() => {
        if (!accountNumbers) {
            console.error('No account number provided');
            return;
        }
        
        const newTrades: Trade[] = [];
        const missingCommissionsTemp: { [key: string]: boolean } = {};

        csvData.forEach(row => {
            const item: Partial<Trade> = {};
            let quantity = 0;

            headers.forEach((header, index) => {
                if (atasMappings[header]) {
                    const key = atasMappings[header] as keyof Trade;
                    const cellValue = row[index];
                    
                    switch (key) {
                        case 'quantity':
                            quantity = Math.abs(parseFloat(String(cellValue)) || 0);
                            item[key] = quantity;
                            break;
                        case 'pnl':
                            const { pnl, error } = formatPnl(cellValue)
                            if (error) {
                                return
                            }
                            item[key] = pnl
                            break;
                        case 'entryDate':
                        case 'closeDate':
                            item[key] = parseAtasDate(cellValue);
                            break;
                        case 'entryPrice':
                        case 'closePrice':
                            if (cellValue) {
                                // Convert to string and remove commas
                                const priceString = String(cellValue).replace(/,/g, '');
                                item[key] = priceString;
                            } else {
                                item[key] = '0';
                            }
                            break;
                        case 'accountNumber':
                            // Do nothing here, account number will be set later
                            break;
                        default:
                            // Convert to string for text fields, or keep as is for other types
                            if (typeof cellValue === 'string' || typeof cellValue === 'number') {
                                (item as any)[key] = String(cellValue);
                            } else {
                                (item as any)[key] = cellValue;
                            }
                    }
                }
            });

            if (!item.entryDate || !item.closeDate) {
                console.warn('Missing required dates');
                return;
            }

            if (!item.instrument || String(item.instrument).trim() === '') {
                return;
            }
            
            // Ensure instrument is a string
            item.instrument = String(item.instrument).trim();

            // Validate that open and close quantities match (for complete trades)
            const closeQuantityIndex = headers.findIndex(h => h === 'Close volume');
            const closeQuantity = closeQuantityIndex >= 0 ? Math.abs(parseFloat(String(row[closeQuantityIndex])) || 0) : 0;
            
            if (quantity !== closeQuantity) {
                console.warn(`Quantity mismatch for ${item.instrument}: open=${quantity}, close=${closeQuantity}`);
                // Still process the trade but use the open quantity
            }

            // Determine trade side based on quantity sign in the original data
            const originalOpenVolume = parseFloat(String(row[headers.findIndex(h => h === 'Open volume')] || '0'));
            const originalCloseVolume = parseFloat(String(row[headers.findIndex(h => h === 'Close volume')] || '0'));
            
            if (originalOpenVolume > 0 && originalCloseVolume < 0) {
                item.side = 'long';
            } else if (originalOpenVolume < 0 && originalCloseVolume > 0) {
                item.side = 'short';
            } else {
                // Default to long if we can't determine
                item.side = 'long';
            }

            // Calculate time in position
            if (item.entryDate && item.closeDate) {
                const entryTime = new Date(item.entryDate).getTime();
                const closeTime = new Date(item.closeDate).getTime();
                const timeInPosition = Math.round((closeTime - entryTime) / 1000); // Convert to seconds
                item.timeInPosition = timeInPosition;
            }

            // Handle commissions
            if (item.instrument) {
                // Remove the last 6 characters if they exist (e.g., U5@CME)
                // This removes the month code (U5) and exchange suffix (@CME)
                if (item.instrument.length > 6) {
                    item.instrument = item.instrument.slice(0, -6)
                }
                if (existingCommissions[item.instrument]) {
                    item.commission = existingCommissions[item.instrument] * item.quantity!
                } else {
                    missingCommissionsTemp[item.instrument] = true
                }
            }

            // Generate unique IDs for entry and close
            item.entryId = `atas_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            item.closeId = `atas_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            // Generate trade hash for deduplication
            const tradeHash = generateTradeHash(item);
            
            // Check if trade already exists
            const existingTrade = existingTrades.find(trade => 
                trade.accountNumber === item.accountNumber &&
                trade.instrument === item.instrument &&
                trade.entryDate === item.entryDate &&
                trade.closeDate === item.closeDate &&
                trade.quantity === item.quantity
            );

            if (!existingTrade) {
                newTrades.push(item as Trade);
            }
        });

        setTrades(newTrades);
        setProcessedTrades(newTrades);

        const missingInstruments = Object.keys(missingCommissionsTemp);
        if (missingInstruments.length > 0) {
            setMissingCommissions(missingInstruments.reduce((acc, instrument) => {
                acc[instrument] = 0;
                return acc;
            }, {} as { [key: string]: number }));
            setShowCommissionPrompt(true);
        }
    }, [csvData, headers, accountNumbers, existingTrades, existingCommissions, setProcessedTrades, t]);

    const handleCommissionChange = (instrument: string, value: string) => {
        setMissingCommissions(prev => ({
            ...prev,
            [instrument]: parseFloat(value) || 0
        }));
    };

    const applyCommissions = () => {
        const updatedTrades = trades.map(trade => {
            if (trade.instrument && missingCommissions[trade.instrument] !== undefined) {
                return {
                    ...trade,
                    commission: missingCommissions[trade.instrument] * trade.quantity
                };
            }
            return trade;
        });

        setTrades(updatedTrades);
        setProcessedTrades(updatedTrades);
        setShowCommissionPrompt(false);
        toast.success(t('import.commission.success.title'), {
            description: t('import.commission.success.description')
        });
    };

    useEffect(() => {
        if (csvData.length > 0) {
            processTrades();
        }
    }, [csvData, processTrades]);

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex-1 overflow-auto">
                <div className="space-y-4 p-6">
                    {showCommissionPrompt && (
                        <div className="flex-none bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-r" role="alert">
                            <p className="font-bold">{t('import.commission.title')}</p>
                            <p>{t('import.commission.description')}</p>
                            <p className="mt-2 text-sm">{t('import.commission.help')}</p>
                            <p className="text-sm italic">{t('import.commission.example')}</p>
                            <div className="mt-4 space-y-2">
                                {Object.keys(missingCommissions).map(instrument => (
                                    <div key={instrument} className="flex items-center space-x-2">
                                        <label htmlFor={`commission-${instrument}`} className="min-w-[200px]">
                                            {instrument} - {t('import.commission.perContract')}
                                        </label>
                                        <Input
                                            id={`commission-${instrument}`}
                                            type="number"
                                            step="0.01"
                                            value={missingCommissions[instrument]}
                                            onChange={(e) => handleCommissionChange(instrument, e.target.value)}
                                            className="w-24"
                                        />
                                    </div>
                                ))}
                            </div>
                            <Button onClick={applyCommissions} className="mt-4">
                                {t('import.commission.apply')}
                            </Button>
                        </div>
                    )}
                    {trades.length === 0 && (
                        <div className="flex-none bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-r" role="alert">
                            <p className="font-bold">{t('import.error.duplicateTrades')}</p>
                            <p>{t('import.error.duplicateTradesDescription')}</p>
                        </div>
                    )}
                    <div className="px-2">
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
                                {trades.map((trade, index) => (
                                    <TableRow key={`atas-trade-${index}-${trade.entryId}-${trade.closeId}`}>
                                        <TableCell>{trade.instrument}</TableCell>
                                        <TableCell>{trade.side}</TableCell>
                                        <TableCell>{trade.quantity}</TableCell>
                                        <TableCell>{trade.entryPrice}</TableCell>
                                        <TableCell>{trade.closePrice || '-'}</TableCell>
                                        <TableCell>{new Date(trade.entryDate).toLocaleString()}</TableCell>
                                        <TableCell>{trade.closeDate ? new Date(trade.closeDate).toLocaleString() : '-'}</TableCell>
                                        <TableCell className={trade.pnl && trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'}>
                                            {trade.pnl?.toFixed(2)}
                                        </TableCell>
                                        <TableCell>{`${Math.floor((trade.timeInPosition || 0) / 60)}m ${Math.floor((trade.timeInPosition || 0) % 60)}s`}</TableCell>
                                        <TableCell>{trade.commission?.toFixed(2)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                    <div className="flex justify-between px-2 py-4">
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
                    <div className="px-2">
                        <h3 className="text-lg font-semibold mb-2">Instruments Traded</h3>
                        <div className="flex flex-wrap gap-2">
                            {uniqueInstruments.map((instrument) => (
                                <Button
                                    key={instrument}
                                    variant="outline"
                                >
                                    {instrument}
                                </Button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
} 