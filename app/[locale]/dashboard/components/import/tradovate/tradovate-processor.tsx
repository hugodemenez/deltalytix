'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from 'sonner'
import { Trade } from '@/prisma/generated/prisma/browser'
import { useI18n } from '@/locales/client'
import { useTradesStore } from '@/store/trades-store'
import { generateTradeHash } from '@/lib/utils'
import { PlatformProcessorProps } from '../config/platforms'
import { ProcessedTradesPreview } from '../components/processed-trades-preview'

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


export default function TradovateProcessor({ headers, csvData, processedTrades, setProcessedTrades, accountNumbers }: PlatformProcessorProps) {
    const existingTrades = useTradesStore((state => state.trades))
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

    const processTrades = useCallback(() => {
        const newTrades: Trade[] = [];
        const missingCommissionsTemp: { [key: string]: boolean } = {};

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
                        case 'entryDate':
                        case 'closeDate':
                            if (cellValue) {
                                try {
                                    // Split date and time
                                    const [datePart, timePart] = cellValue.split(' ');
                                    
                                    if (!datePart || !timePart) {
                                        console.error(`Invalid date format: ${cellValue}`);
                                        item[key] = undefined;
                                        break;
                                    }

                                    // Parse MM/DD/YYYY format
                                    const [month, day, year] = datePart.split('/').map(Number);
                                    const [hours, minutes, seconds] = timePart.split(':').map(Number);
                                    
                                    // Validate all components
                                    if ([year, month, day, hours, minutes, seconds].some(n => isNaN(n))) {
                                        console.error(`Invalid date components:`, {
                                            year, month, day, hours, minutes, seconds
                                        });
                                        item[key] = undefined;
                                        break;
                                    }

                                    // Create date in local time (month - 1 because JS months are 0-based)
                                    const localDate = new Date(year, month - 1, day, hours, minutes, seconds);
                                    
                                    // Validate the created date
                                    if (isNaN(localDate.getTime())) {
                                        console.error(`Invalid date created:`, localDate);
                                        item[key] = undefined;
                                        break;
                                    }

                                    // Convert to UTC
                                    const utcDate = new Date(localDate.toISOString());
                                    
                                    // Format with explicit +00:00 timezone
                                    item[key] = utcDate.toISOString().replace('Z', '+00:00');

                                } catch (error) {
                                    console.error(`Error parsing date: ${cellValue}`, error);
                                    item[key] = undefined;
                                }
                            } else {
                                item[key] = undefined;
                            }
                            break;
                        default:
                            item[key] = cellValue as any;
                    }
                }
            });

            if (!item.entryDate) {
                console.warn('Missing required entryDate');
                return;
            }

            if (item.instrument == '') {
                return;
            }

            if (item.instrument) {
                item.instrument = item.instrument.slice(0, -2)
                if (existingCommissions[item.instrument]) {
                    item.commission = existingCommissions[item.instrument] * item.quantity!
                } else {
                    missingCommissionsTemp[item.instrument] = true
                }
            }

            // If entryDate is after closeDate (which is buy and sell on tradovate then it means it is short)
            if (item.entryDate && item.closeDate && new Date(item.entryDate) > new Date(item.closeDate)) {
                item.side = 'short'
                // For short trades, swap the dates because Tradovate's "boughtTimestamp" 
                // is actually the sell (entry) and "soldTimestamp" is the buy (exit)
                const tempDate = item.entryDate;
                item.entryDate = item.closeDate;
                item.closeDate = tempDate;

                // Swap the buy and sell prices
                const tempPrice = item.entryPrice;
                item.entryPrice = item.closePrice;
                item.closePrice = tempPrice;
            } else {
                item.side = 'long'
            }

            item.id = generateTradeHash(item as Trade).toString();
            newTrades.push(item as Trade);
        })

        setProcessedTrades(newTrades);
        setMissingCommissions(Object.keys(missingCommissionsTemp).reduce((acc, key) => ({
            ...acc,
            [key]: existingCommissions[key] || 0
        }), {}));
        setShowCommissionPrompt(Object.keys(missingCommissionsTemp).length > 0);
    }, [csvData, headers, existingCommissions, setProcessedTrades]);

    useEffect(() => {
        processTrades();
    }, [processTrades]);

    const handleCommissionChange = (instrument: string, value: string) => {
        setMissingCommissions(prev => ({ ...prev, [instrument]: parseFloat(value) || 0 }));
    };

    const applyCommissions = () => {
        const updatedTrades = processedTrades.map(trade => {
            if (trade.instrument && trade.quantity && trade.commission === undefined) {
            if (missingCommissions.hasOwnProperty(trade.instrument)) {
                return {
                    ...trade,
                    commission: missingCommissions[trade.instrument] * trade.quantity
                };
            }
            return trade;
        }
            return trade;
        });
        setProcessedTrades(updatedTrades);
        setShowCommissionPrompt(false);
        toast.success(t('import.commission.success.title'), {
            description: t('import.commission.success.description')
        });
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex-1 overflow-auto">
                <div className="space-y-8 p-0 sm:p-0">
                    {showCommissionPrompt && (
                        <div className="space-y-3 border border-black/10 p-4 dark:border-white/10" role="alert">
                            <p className="text-sm font-medium">{t('import.commission.title')}</p>
                            <p className="text-sm leading-relaxed text-black/55 dark:text-white/55">{t('import.commission.description')}</p>
                            <p className="text-sm text-black/55 dark:text-white/55">{t('import.commission.help')}</p>
                            <p className="text-sm text-black/45 italic dark:text-white/45">{t('import.commission.example')}</p>
                            <div className="space-y-2 pt-2">
                                {Object.keys(missingCommissions).map(instrument => (
                                    <div key={instrument} className="flex items-center gap-3">
                                        <label htmlFor={`commission-${instrument}`} className="min-w-[200px] text-sm">
                                            {instrument} — {t('import.commission.perContract')}
                                        </label>
                                        <Input
                                            id={`commission-${instrument}`}
                                            type="number"
                                            step="0.01"
                                            value={missingCommissions[instrument]}
                                            onChange={(e) => handleCommissionChange(instrument, e.target.value)}
                                            className="h-10 w-24 rounded-sm"
                                        />
                                    </div>
                                ))}
                            </div>
                            <Button onClick={applyCommissions} className="mt-2 rounded-sm">
                                {t('import.commission.apply')}
                            </Button>
                        </div>
                    )}
                    {processedTrades.length === 0 && (
                        <div className="space-y-1 border border-black/10 p-4 dark:border-white/10" role="alert">
                            <p className="text-sm font-medium">{t('import.error.duplicateTrades')}</p>
                            <p className="text-sm text-black/55 dark:text-white/55">{t('import.error.duplicateTradesDescription')}</p>
                        </div>
                    )}
                    <ProcessedTradesPreview trades={processedTrades} />
                </div>
            </div>
        </div>
    )
}