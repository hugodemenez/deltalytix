import React, { useState, useEffect, useCallback } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Trade } from '@/prisma/generated/prisma/client'
import { Button } from "@/components/ui/button"
import { formatInTimeZone } from 'date-fns-tz'
import { useUserStore } from '@/store/user-store'
import { PlatformProcessorProps } from '../config/platforms'
import { generateDeterministicTradeId } from '@/lib/trade-id-utils'

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
    const timezone = useUserStore(state => state.timezone)

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

    const totalPnL = processedTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
    const totalCommission = processedTrades.reduce((sum, trade) => sum + (trade.commission || 0), 0);
    const uniqueInstruments = Array.from(new Set(processedTrades.map(trade => trade.instrument)));

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex-1 overflow-auto">
                <div className="space-y-4 p-6">
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
                                    <TableHead>Commission</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {processedTrades.map((trade) => (
                                    <TableRow key={trade.id}>
                                        <TableCell>{trade.instrument}</TableCell>
                                        <TableCell>{trade.side}</TableCell>
                                        <TableCell>{trade.quantity}</TableCell>
                                        <TableCell>{trade.entryPrice}</TableCell>
                                        <TableCell>{trade.closePrice}</TableCell>
                                        <TableCell>
                                            {trade.entryDate ? formatInTimeZone(new Date(trade.entryDate), timezone, 'yyyy-MM-dd HH:mm:ss') : '-'}
                                        </TableCell>
                                        <TableCell>
                                            {trade.closeDate ? formatInTimeZone(new Date(trade.closeDate), timezone, 'yyyy-MM-dd HH:mm:ss') : '-'}
                                        </TableCell>
                                        <TableCell className={trade.pnl ? trade.pnl < 0 ? 'text-red-600' : 'text-green-600' : ''}>
                                            {trade.pnl?.toFixed(2)}
                                        </TableCell>
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