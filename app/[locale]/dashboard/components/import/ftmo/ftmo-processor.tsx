'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Trade } from '@/prisma/generated/prisma/browser'
import { useI18n } from '@/locales/client'
import { createTradeWithDefaults } from '@/lib/trade-factory'
import { PlatformProcessorProps } from '../config/platforms'

const formatDuration = (seconds: number): string => {
    if (seconds === 0) return '0s'
    
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = seconds % 60
    
    const parts: string[] = []
    
    if (days > 0) parts.push(`${days}d`)
    if (hours > 0) parts.push(`${hours}h`)
    if (minutes > 0) parts.push(`${minutes}m`)
    if (remainingSeconds > 0) parts.push(`${remainingSeconds}s`)
    
    return parts.join(' ')
}

export default function FtmoProcessor({ headers, csvData, processedTrades, setProcessedTrades }: PlatformProcessorProps) {
    const t = useI18n()

    const processTrades = useCallback(() => {
        const newTrades: Trade[] = [];

        // FTMO CSV structure (position-based, not header-based):
        // 0: Ticket, 1: Ouvrir, 2: Type, 3: Volume, 4: Symbole, 5: Prix (entry), 6: SL, 7: TP, 8: Fermeture, 9: Prix (exit), 10: Swap, 11: Commissions, 12: Profit, 13: Pips, 14: Durée du trade en secondes

        // Process all rows starting from the first row
        for (let i = 0; i < csvData.length; i++) {
            const row = csvData[i]
            
            // Skip empty rows
            if (!row || row.length === 0 || !row[0] || row[0].trim() === '') {
                continue
            }

            // Validate required fields
            if (row.length < 15) {
                console.warn(`Row ${i + 1} has insufficient columns:`, row)
                continue
            }

            const ticket = row[0]?.trim() || ''
            const openTime = row[1]?.trim() || ''
            const type = row[2]?.trim().toLowerCase() || ''
            const volume = parseFloat(row[3]?.replace(',', '.') || '0')
            const symbol = row[4]?.trim() || ''
            const entryPrice = parseFloat(row[5]?.replace(',', '.') || '0')
            const closeTime = row[8]?.trim() || ''
            const exitPrice = parseFloat(row[9]?.replace(',', '.') || '0')
            const swap = parseFloat(row[10]?.replace(',', '.') || '0')
            const commission = parseFloat(row[11]?.replace(',', '.') || '0')
            const profit = parseFloat(row[12]?.replace(',', '.') || '0')
            const duration = parseInt(row[14]?.replace(',', '.') || '0')
            

            // Validate essential fields
            if (!ticket || !symbol || !openTime || !closeTime) {
                console.warn(`Row ${i + 1} missing essential data:`, { ticket, symbol, openTime, closeTime })
                continue
            }

            // Parse dates
            const openDate = new Date(openTime)
            const closeDate = new Date(closeTime)

            // Validate dates
            if (isNaN(openDate.getTime()) || isNaN(closeDate.getTime())) {
                console.warn(`Row ${i + 1} has invalid dates:`, { openTime, closeTime })
                continue
            }

            // Determine side based on type
            const side = type === 'buy' ? 'long' : 'short'

            // Calculate quantity (volume in FTMO)
            const quantity = Math.abs(volume)
            
            // Calculate total commission including swap (overnight financing costs)
            const totalCommission = Math.abs(commission) - swap

            const trade = createTradeWithDefaults({
                quantity,
                instrument: symbol,
                entryPrice: entryPrice.toString(),
                closePrice: exitPrice.toString(),
                entryDate: openDate.toISOString(),
                closeDate: closeDate.toISOString(),
                pnl: profit,
                commission: totalCommission,
                timeInPosition: duration,
                side,
                comment: `FTMO Trade ${ticket}`,
            })

            // FTMO provides all cost information directly, no need for commission handling

            newTrades.push(trade as Trade)
        }

        setProcessedTrades(newTrades);
    }, [csvData, setProcessedTrades]);

    useEffect(() => {
        processTrades();
    }, [processTrades]);


    const totalPnL = useMemo(() => processedTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0), [processedTrades]);
    const totalCommission = useMemo(() => processedTrades.reduce((sum, trade) => sum + ((trade as any).commissionOnly || 0), 0), [processedTrades]);
    const totalSwap = useMemo(() => processedTrades.reduce((sum, trade) => sum + ((trade as any).swap || 0), 0), [processedTrades]);
    const totalCost = useMemo(() => processedTrades.reduce((sum, trade) => sum + (trade.commission || 0), 0), [processedTrades]);
    const uniqueInstruments = useMemo(() => Array.from(new Set(processedTrades.map(trade => trade.instrument))), [processedTrades]);

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex-1 overflow-auto">
                <div className="space-y-4 p-6">
                    {processedTrades.length === 0 && (
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
                                    <TableHead>Account</TableHead>
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
                                    <TableHead>Swap</TableHead>
                                    <TableHead>Total Cost</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {processedTrades.map((trade) => (
                                    <TableRow key={trade.id}>
                                        <TableCell>{trade.accountNumber}</TableCell>
                                        <TableCell>{trade.instrument}</TableCell>
                                        <TableCell>{trade.side}</TableCell>
                                        <TableCell>{trade.quantity}</TableCell>
                                        <TableCell>{trade.entryPrice}</TableCell>
                                        <TableCell>{trade.closePrice || '-'}</TableCell>
                                        <TableCell>{trade.entryDate ? new Date(trade.entryDate).toLocaleString() : '-'}</TableCell>
                                        <TableCell>{trade.closeDate ? new Date(trade.closeDate).toLocaleString() : '-'}</TableCell>
                                        <TableCell className={trade.pnl && trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'}>
                                            {trade.pnl?.toFixed(2)}
                                        </TableCell>
                                        <TableCell>{formatDuration(trade.timeInPosition || 0)}</TableCell>
                                        <TableCell>${(trade as any).commissionOnly?.toFixed(2) || '0.00'}</TableCell>
                                        <TableCell className={(trade as any).swap >= 0 ? 'text-green-600' : 'text-red-600'}>
                                            ${(trade as any).swap?.toFixed(2) || '0.00'}
                                        </TableCell>
                                        <TableCell className="font-semibold">${trade.commission?.toFixed(2) || '0.00'}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-2 py-4">
                        <div>
                            <h3 className="text-lg font-semibold mb-2">Total PnL</h3>
                            <p className={`text-xl font-bold ${totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                ${totalPnL.toFixed(2)}
                            </p>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold mb-2">Total Commission</h3>
                            <p className="text-xl font-bold text-blue-600">
                                ${totalCommission.toFixed(2)}
                            </p>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold mb-2">Total Swap</h3>
                            <p className="text-xl font-bold text-orange-600">
                                ${totalSwap.toFixed(2)}
                            </p>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold mb-2">Total Cost</h3>
                            <p className="text-xl font-bold text-purple-600">
                                ${totalCost.toFixed(2)}
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
