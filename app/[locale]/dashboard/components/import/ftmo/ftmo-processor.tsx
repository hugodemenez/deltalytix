'use client'

import React, { useEffect, useCallback } from 'react'
import { Trade } from '@/prisma/generated/prisma/browser'
import { useI18n } from '@/locales/client'
import { createTradeWithDefaults } from '@/lib/trade-factory'
import { PlatformProcessorProps } from '../config/platforms'
import { ProcessedTradesPreview } from '../components/processed-trades-preview'

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
                    <ProcessedTradesPreview trades={processedTrades} />
                </div>
            </div>
        </div>
    )
}
