import React, { useState, useEffect, useCallback } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from '@/hooks/use-toast'
import { Trade } from '@prisma/client'

interface TopstepProcessorProps {
    headers: string[];
    csvData: string[][];
    setProcessedTrades: React.Dispatch<React.SetStateAction<Trade[]>>;
}

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

export default function TopstepProcessor({ headers, csvData, setProcessedTrades }: TopstepProcessorProps) {
    const [trades, setTrades] = useState<Trade[]>([])

    const processTrades = useCallback(() => {
        const newTrades: Trade[] = [];
        const accountNumber = 'topstep-account';

        csvData.forEach(row => {
            const item: Partial<Trade> = {};
            let quantity = 0;
            headers.forEach((header, index) => {
                const mappingKey = Object.keys(mappings).find(key => header.includes(key));
                if (mappingKey) {
                    const key = mappings[mappingKey] as keyof Trade;
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
                        case 'side':
                            // The Type column in Topstep CSV already contains "Long" or "Short"
                            item[key] = cellValue ? cellValue.toLowerCase() : 'long';
                            break;
                        case 'entryPrice':
                        case 'closePrice':
                            item[key] = (parseFloat(cellValue) || 0).toString();
                            break;
                        case 'instrument':
                            // Trim the last two characters from the instrument symbol (e.g., "MESH5" -> "MES")
                            item[key] = cellValue ? cellValue.slice(0, -2) : cellValue;
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
                toast({
                    title: "Error",
                    description: "There was an error processing the trades. Please check the data and try again."
                })
                return;
            }

            // Calculate time in position in seconds
            if (item.entryDate && item.closeDate) {
                const entryTime = new Date(item.entryDate).getTime();
                const closeTime = new Date(item.closeDate).getTime();
                item.timeInPosition = Math.round((closeTime - entryTime) / 1000);
            }

            // This is going to be set later
            item.userId = ''
            if (!item.accountNumber) {
                item.accountNumber = accountNumber;
            }
            item.id = `${item.entryId}-${item.closeId}`;
            newTrades.push(item as Trade);
        });

        setTrades(newTrades);
        setProcessedTrades(newTrades);
    }, [csvData, headers, setProcessedTrades]);

    useEffect(() => {
        processTrades();
    }, [processTrades]);

    const totalPnL = trades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
    const totalCommission = trades.reduce((sum, trade) => sum + (trade.commission || 0), 0);
    const uniqueInstruments = Array.from(new Set(trades.map(trade => trade.instrument)));

    return (
        <div className="space-y-4 p-4">
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
                        {trades.map((trade) => (
                            <TableRow key={trade.id}>
                                <TableCell>{trade.instrument}</TableCell>
                                <TableCell>{trade.side}</TableCell>
                                <TableCell>{trade.quantity}</TableCell>
                                <TableCell>{trade.entryPrice}</TableCell>
                                <TableCell>{trade.closePrice}</TableCell>
                                <TableCell>{new Date(trade.entryDate).toLocaleString()}</TableCell>
                                <TableCell>{trade.closeDate ? new Date(trade.closeDate).toLocaleString() : '-'}</TableCell>
                                <TableCell className={trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'}>
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
        </div>
    )
} 