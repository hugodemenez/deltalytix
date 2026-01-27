'use client'

import React, { useEffect, useState, useRef, useMemo } from 'react'
import { useI18n } from "@/locales/client"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { format, isValid } from "date-fns"
import { parsePositionTime } from "@/lib/utils"
import { cn } from "@/lib/utils"
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getExpandedRowModel,
  SortingState,
  getSortedRowModel,
} from "@tanstack/react-table"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { orderSchema, tradeSchema } from '@/app/api/imports/ibkr/fifo-computation/schema'
import { financialInstrumentSchema, type FinancialInstrument } from '@/app/api/imports/ibkr/extract-orders/schema'
import { experimental_useObject as useObject } from '@ai-sdk/react'
import { z } from 'zod/v3';
import { ChevronDown, ChevronRight } from "lucide-react"
import { DataTableColumnHeader } from '../../tables/column-header'
import { Trade as PrismaTrade } from '@/prisma/generated/prisma/browser'
import { generateDeterministicTradeId } from '@/lib/trade-id-utils'
import { createTradeWithDefaults } from '@/lib/trade-factory'

type Order = z.infer<typeof orderSchema>
type Trade = z.infer<typeof tradeSchema>

interface PdfProcessingProps {
  setError: React.Dispatch<React.SetStateAction<string | null>>
  setStep: React.Dispatch<React.SetStateAction<any>>
  processedTrades: Partial<PrismaTrade>[]
  setProcessedTrades: (trades: Partial<PrismaTrade>[]) => void;
  extractedText: string
  userId: string
}

export default function PdfProcessing({
  setError,
  setStep,
  processedTrades,
  setProcessedTrades,
  extractedText,
  userId
}: PdfProcessingProps) {
  const t = useI18n()
  const tableContainerRef = useRef<HTMLDivElement>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [orders, setOrders] = useState<Order[]>([])
  const [instruments, setInstruments] = useState<FinancialInstrument[]>([])
  const [sorting, setSorting] = useState<SortingState>([
    { id: "entryDate", desc: true }
  ])
  const [trades, setTrades] = useState<Trade[]>([])
  const hasStartedProcessing = useRef(false)

  // Stream orders from text
  const { object: orderObject, submit: submitOrders } = useObject({
    api: '/api/imports/ibkr/extract-orders',
    schema: z.object({
      orders: z.array(orderSchema),
      instruments: z.array(financialInstrumentSchema)
    }),
    onError(error) {
      console.error('Error processing orders:', error);
      setError(`Failed to process orders: ${error.message}`);
    }
  });

  // Stream trades from orders
  const { object: tradeObject, submit: submitTrades } = useObject({
    api: '/api/imports/ibkr/fifo-computation',
    schema: z.array(tradeSchema),
    onError(error) {
      console.error('Error processing trades:', error);
      setError(`Failed to process trades: ${error.message}`);
    }
  });

  // Handle new orders and instruments
  useEffect(() => {
    if (orderObject && orderObject.orders && orderObject.instruments) {
      // The orderObject.orders already comes in the correct schema format from the API
      const validOrders = orderObject.orders.filter((order): order is Order => {
        return !!(order && 
          order.rawSymbol && 
          order.side && 
          order.quantity !== undefined && 
          order.price !== undefined && 
          order.timestamp);
      });
      
      setOrders(prev => [...prev, ...validOrders]);
      
      // Filter and validate instruments
      const validInstruments = orderObject.instruments.filter((instrument): instrument is FinancialInstrument => {
        return !!(instrument && 
          instrument.symbol && 
          instrument.description && 
          instrument.conid && 
          instrument.underlying && 
          instrument.listingExchange && 
          instrument.multiplier !== undefined && 
          instrument.expiry && 
          instrument.deliveryMonth && 
          instrument.instrumentType);
      });
      
      setInstruments(validInstruments);
    }
  }, [orderObject]);

  // Handle new trades
  useEffect(() => {
    if (tradeObject && Array.isArray(tradeObject)) {
      const newTrades = tradeObject.filter((trade): trade is Trade => trade !== undefined);
      
      // Replace all trades instead of appending to avoid duplicates during streaming
      setTrades(newTrades);
      
      // Convert ApiTrade to Prisma Trade format for processedTrades
      const convertedTrades: PrismaTrade[] = newTrades.map(trade => {
        return createTradeWithDefaults({
          accountNumber: '',
          quantity: trade.quantity,
          entryId: trade.entryId || '',
          closeId: trade.closeId || '',
          instrument: trade.instrument,
          entryPrice: trade.entryPrice,
          closePrice: trade.closePrice,
          entryDate: trade.entryDate,
          closeDate: trade.closeDate,
          pnl: trade.pnl,
          timeInPosition: trade.timeInPosition,
          userId: userId,
          side: trade.side || '',
          commission: Math.abs(trade.commission || 0),
        });
      });
      
      setProcessedTrades(convertedTrades);

      setTimeout(() => {
        scrollToBottom();
      }, 100);
    }
  }, [tradeObject, setProcessedTrades]);

  // Auto-process text on mount when extractedText is available
  useEffect(() => {
    const processText = async () => {
      if (!extractedText || hasStartedProcessing.current) {
        return;
      }

      hasStartedProcessing.current = true;
      setIsProcessing(true);
      setOrders([]);

      try {
        // Start streaming orders
        submitOrders({ text: extractedText });
      } catch (error) {
        console.error('Error processing orders:', error);
        setError(error instanceof Error ? error.message : 'Failed to process orders');
      } finally {
        setIsProcessing(false);
      }
    };

    processText();
  }, [extractedText, submitOrders, setError]);

  // Automatically process trades when orders are available
  useEffect(() => {
    if (orders.length > 0 && instruments.length > 0 && !isProcessing) {
      submitTrades({ orders, instruments });
    }
  }, [orders, instruments, isProcessing]);

  // Helper function to get orders for a trade using API trade data
  const getTradeOrders = (trade: Trade) => {
    const tradeOrders: Order[] = [];
    
    // Find corresponding API trade to get orderIds
    const apiTrade = trades.find(t => 
      t.instrument === trade.instrument && 
      t.entryDate === trade.entryDate && 
      t.closeDate === trade.closeDate
    );
    
    if (apiTrade && apiTrade.orderIds && apiTrade.orderIds.length > 0) {
      apiTrade.orderIds.forEach((orderId: string) => {
        const order = orders.find(order => order.orderId === orderId);
        if (order) tradeOrders.push(order);
      });
    } else {
      // Fallback to individual entryId and closeId fields
      if (trade.entryId) {
        const entryOrder = orders.find(order => order.orderId === trade.entryId);
        if (entryOrder) tradeOrders.push(entryOrder);
      }
      
      if (trade.closeId) {
        const closeOrder = orders.find(order => order.orderId === trade.closeId);
        if (closeOrder) tradeOrders.push(closeOrder);
      }
    }
    
    return tradeOrders;
  };

  // Column definitions for the table
  const columns = useMemo<ColumnDef<Trade>[]>(() => [
    {
      accessorKey: "entryDate",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('trade-table.entryDate')} />
      ),
      cell: ({ row }) => {
        const trade = row.original;
        return trade.entryDate ? format(new Date(trade.entryDate), "yyyy-MM-dd HH:mm") : "Invalid Date";
      },
      sortingFn: (rowA, rowB, columnId) => {
        const a = new Date(rowA.getValue(columnId)).getTime();
        const b = new Date(rowB.getValue(columnId)).getTime();
        return a < b ? -1 : a > b ? 1 : 0;
      },
      size: 160,
    },
    {
      accessorKey: "instrument",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('trade-table.instrument')} />
      ),
      cell: ({ row }) => (
        <div className="font-medium">
          {row.original.instrument}
        </div>
      ),
      size: 120,
    },
    {
      accessorKey: "side",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('trade-table.direction')} />
      ),
      cell: ({ row }) => (
        <Badge variant={row.original.side === 'long' ? 'default' : 'destructive'}>
          {row.original.side?.toUpperCase()}
        </Badge>
      ),
      size: 100,
    },
    {
      accessorKey: "quantity",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('trade-table.quantity')} />
      ),
      cell: ({ row }) => (
        <div className="font-medium">
          {row.original.quantity}
        </div>
      ),
      size: 100,
    },
    {
      accessorKey: "entryPrice",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('trade-table.entryPrice')} />
      ),
      cell: ({ row }) => (
        <div className="font-medium">
          ${Number(row.original.entryPrice).toFixed(2)}
        </div>
      ),
      size: 120,
    },
    {
      accessorKey: "commission",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('calendar.modal.commission')} />
      ),
      cell: ({ row }) => (
        <div className="font-medium">
          ${row.original.commission?.toFixed(2) || '0.00'}
        </div>
      ),
      size: 100,
    },
    {
      accessorKey: "pnl",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="P&L" />
      ),
      cell: ({ row }) => (
        <Badge variant={row.original.pnl >= 0 ? 'default' : 'destructive'}>
          ${Number(row.original.pnl).toFixed(2)}
        </Badge>
      ),
      size: 100,
    },
    {
      accessorKey: "timeInPosition",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('trade-table.positionTime')} />
      ),
      cell: ({ row }) => {
        const timeInPosition = row.original.timeInPosition || 0;
        return <div>{parsePositionTime(timeInPosition)}</div>;
      },
      sortingFn: (rowA, rowB, columnId) => {
        const a = rowA.original.timeInPosition || 0;
        const b = rowB.original.timeInPosition || 0;
        return a - b;
      },
      size: 120,
    },
  ], [t]);

  // Create table instance
  const table = useReactTable({
    data: trades,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    defaultColumn: {
      size: 150,
      minSize: 100,
    },
  });

  const renderTradeRow = (row: any) => {
    const trade = row.original;
    const tradeOrders = getTradeOrders(trade);

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <TableRow className="border-b transition-colors hover:bg-muted cursor-default">
              {row.getVisibleCells().map((cell: any) => (
                <TableCell
                  key={cell.id}
                  className="whitespace-nowrap px-4 py-2.5 text-sm"
                  style={{ width: cell.column.getSize() }}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          </TooltipTrigger>
          <TooltipContent side="right" className="p-0">
            <div className="max-w-md">
              <div className="p-2 border-b bg-muted">
                <p className="font-medium text-sm">Trade Orders</p>
              </div>
              <div className="p-2">
                {tradeOrders.length > 0 ? (
                  <div className="space-y-2">
                    {tradeOrders.map((order, orderIndex) => (
                      <div key={orderIndex} className="text-xs space-y-1">
                        <div className="flex justify-between">
                          <span className="font-medium">{order.side}</span>
                          <span>{order.timestamp ? format(new Date(order.timestamp), "HH:mm:ss") : "Invalid"}</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>Qty: {order.quantity}</span>
                          <span>Price: ${Number(order.price).toFixed(2)}</span>
                        </div>
                        {orderIndex < tradeOrders.length - 1 && <div className="border-b"></div>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No matching orders found</p>
                )}
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  // Calculate totals
  const totals = useMemo(() => {
    if (processedTrades.length === 0) return null;
    
    return {
      totalTrades: processedTrades.length,
      totalQuantity: processedTrades.reduce((sum, trade) => sum + (Number(trade.quantity) || 0), 0),
      totalCommission: processedTrades.reduce((sum, trade) => sum + (Number(trade.commission) || 0), 0),
      totalPnl: processedTrades.reduce((sum, trade) => sum + (Number(trade.pnl) || 0), 0),
      averageEntryPrice: processedTrades.length > 0 
        ? processedTrades.reduce((sum, trade) => sum + (Number(trade.entryPrice) || 0), 0) / processedTrades.length 
        : 0,
      totalTimeInPosition: processedTrades.reduce((sum, trade) => sum + (Number(trade.timeInPosition) || 0), 0),
    };
  }, [processedTrades]);

  const renderTotalRow = () => {
    if (!totals) return null;

    return (
      <TableRow className="border-t-2 bg-muted/30 font-medium">
        <TableCell className="whitespace-nowrap px-4 py-2.5 text-sm font-semibold">
          {t('trade-table.total')} ({totals.totalTrades})
        </TableCell>
        <TableCell className="whitespace-nowrap px-4 py-2.5 text-sm">
          -
        </TableCell>
        <TableCell className="whitespace-nowrap px-4 py-2.5 text-sm">
          -
        </TableCell>
        <TableCell className="whitespace-nowrap px-4 py-2.5 text-sm font-semibold">
          {totals.totalQuantity}
        </TableCell>
        <TableCell className="whitespace-nowrap px-4 py-2.5 text-sm">
          ${totals.averageEntryPrice.toFixed(2)} avg
        </TableCell>
        <TableCell className="whitespace-nowrap px-4 py-2.5 text-sm font-semibold">
          ${totals.totalCommission.toFixed(2)}
        </TableCell>
        <TableCell className="whitespace-nowrap px-4 py-2.5 text-sm">
          <Badge variant={totals.totalPnl >= 0 ? 'default' : 'destructive'} className="font-semibold">
            ${totals.totalPnl.toFixed(2)}
          </Badge>
        </TableCell>
        <TableCell className="whitespace-nowrap px-4 py-2.5 text-sm">
          {parsePositionTime(totals.totalTimeInPosition)}
        </TableCell>
      </TableRow>
    );
  };

  const scrollToBottom = () => {
    if (tableContainerRef.current) {
      const scrollContainer = tableContainerRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: 'smooth'
        });
      }
    }
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center">
        <p className="text-sm text-muted-foreground">
          {orders.length} orders extracted, {instruments.length} instruments found, {processedTrades.length} trades matched
        </p>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="flex flex-col h-full">
          <Table className="w-full">
            <TableHeader className="sticky top-0 z-10 bg-background shadow-xs">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className="whitespace-nowrap px-4 py-3 text-left text-sm"
                      style={{ width: header.getSize() }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
          </Table>
          <ScrollArea className="flex-1" ref={tableContainerRef}>
            <Table className="w-full">
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  <>
                    {table.getRowModel().rows.map((row) => (
                      <React.Fragment key={row.id}>
                        {renderTradeRow(row)}
                      </React.Fragment>
                    ))}
                    {renderTotalRow()}
                  </>
                ) : isProcessing ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      No trades processed yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      </div>
    </div>
  )
} 